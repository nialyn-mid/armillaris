import { useState, useEffect, useRef, useCallback } from 'react';
import type { LoreEntry } from '../../lib/types';

export const useDataStorage = (
    entries: LoreEntry[],
    setEntries: (entries: LoreEntry[]) => void,
    showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void
) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const lastSavedRef = useRef<string>('');
    const autosaveTimerRef = useRef<any>(null);

    const refreshProjects = useCallback(async () => {
        const index = await window.ipcRenderer.getProjects();
        setProjects(index.projects);
        if (index.lastActiveProjectId && !activeProjectId) {
            setActiveProjectId(index.lastActiveProjectId);
        }
    }, [activeProjectId]);

    const refreshVersions = useCallback(async () => {
        if (!activeProjectId) return;
        const vList = await window.ipcRenderer.getVersions(activeProjectId);
        setVersions(vList);
    }, [activeProjectId]);

    // Initial Load
    useEffect(() => {
        refreshProjects();
    }, [refreshProjects]);

    // Switch Project
    useEffect(() => {
        const loadActiveProject = async () => {
            if (!activeProjectId) return;

            const index = await window.ipcRenderer.getProjects();
            const proj = index.projects.find((p: any) => p.id === activeProjectId);

            if (proj?.lastActiveVersion) {
                try {
                    const data = await window.ipcRenderer.loadVersion(activeProjectId, proj.lastActiveVersion);
                    setEntries(data);
                    lastSavedRef.current = JSON.stringify(data);
                } catch (err) {
                    console.error('Failed to load project data', err);
                    showNotification('Failed to load project data', 'error');
                }
            } else {
                setEntries([]);
                lastSavedRef.current = JSON.stringify([]);
            }
            refreshVersions();
        };
        loadActiveProject();
    }, [activeProjectId, setEntries, refreshVersions]);

    // Autosave Logic
    useEffect(() => {
        if (!activeProjectId) return;

        const currentData = JSON.stringify(entries);
        if (currentData === lastSavedRef.current) return;

        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

        autosaveTimerRef.current = setTimeout(async () => {
            try {
                await window.ipcRenderer.saveVersion(activeProjectId, entries);
                lastSavedRef.current = currentData;
                refreshVersions();
                // We don't notify for autosave to avoid noise
            } catch (err) {
                console.error('Autosave failed', err);
            }
        }, 5000); // 5 second throttle for autosave

        return () => clearTimeout(autosaveTimerRef.current);
    }, [entries, activeProjectId, refreshVersions]);

    const manualSave = async () => {
        if (!activeProjectId) return;
        try {
            await window.ipcRenderer.saveVersion(activeProjectId, entries);
            lastSavedRef.current = JSON.stringify(entries);
            refreshVersions();
            showNotification('Project saved manually', 'success');
        } catch (err) {
            showNotification('Failed to save project', 'error');
        }
    };

    const createProject = async (name: string) => {
        try {
            const newProj = await window.ipcRenderer.createProject(name);
            setProjects(prev => [...prev, newProj]);
            setActiveProjectId(newProj.id);
            showNotification(`Project "${name}" created`, 'success');
        } catch (err) {
            showNotification('Failed to create project', 'error');
        }
    };

    const duplicateProject = async (projectId: string, newName: string) => {
        try {
            const newProj = await window.ipcRenderer.duplicateProject(projectId, newName);
            setProjects(prev => [...prev, newProj]);
            setActiveProjectId(newProj.id);
            showNotification(`Project "${newName}" duplicated`, 'success');
        } catch (err) {
            showNotification('Failed to duplicate project', 'error');
        }
    };

    const renameProject = async (projectId: string, newName: string) => {
        try {
            await window.ipcRenderer.renameProject(projectId, newName);
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName } : p));
            showNotification(`Project renamed to "${newName}"`, 'success');
        } catch (err) {
            showNotification('Failed to rename project', 'error');
        }
    };

    const deleteProject = async (projectId: string) => {
        try {
            await window.ipcRenderer.deleteProject(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
            if (activeProjectId === projectId) {
                setActiveProjectId(null);
                setEntries([]);
            }
            showNotification('Project deleted', 'success');
        } catch (err) {
            showNotification('Failed to delete project', 'error');
        }
    };

    const loadVersion = async (versionId: string) => {
        if (!activeProjectId) return;
        try {
            const data = await window.ipcRenderer.loadVersion(activeProjectId, versionId);
            setEntries(data);
            lastSavedRef.current = JSON.stringify(data);
            showNotification('Version loaded', 'info');
        } catch (err) {
            showNotification('Failed to load version', 'error');
        }
    };

    const compressOldVersions = async (cutoffDate: number) => {
        if (!activeProjectId) return;
        try {
            const count = await window.ipcRenderer.compressVersions(activeProjectId, cutoffDate);
            refreshVersions();
            showNotification(`Compressed ${count} old versions`, 'success');
        } catch (err) {
            showNotification('Compression failed', 'error');
        }
    };

    const pruneVersions = async (options: { cutoff?: number, feather?: boolean }) => {
        if (!activeProjectId) return;
        try {
            const count = await window.ipcRenderer.pruneVersions(activeProjectId, options);
            refreshVersions();
            showNotification(`Pruned ${count} versions`, 'success');
        } catch (err) {
            showNotification('Pruning failed', 'error');
        }
    };

    return {
        projects,
        activeProjectId,
        setActiveProjectId,
        versions,
        manualSave,
        createProject,
        renameProject,
        duplicateProject,
        deleteProject,
        loadVersion,
        compressOldVersions,
        pruneVersions,
        refreshProjects,
        refreshVersions
    };
};

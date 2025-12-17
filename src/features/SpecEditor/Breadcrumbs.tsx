import React, { useState, useEffect, useRef } from 'react';
import { MdHome, MdChevronRight, MdExpandMore } from 'react-icons/md';

interface BreadcrumbItem {
    id: string;
    label: string;
}

interface BreadcrumbsProps {
    path: BreadcrumbItem[];
    // onNavigate takes the FULL path to navigate to
    onNavigate: (newPath: BreadcrumbItem[]) => void;
    // masterGraph is required to list children
    masterGraph: any;
}

// Helper to get graph at a specific path
const getGraphAt = (spec: any, path: { id: string }[]) => {
    let current = spec;
    // Walk down the path EXCEPT the last item? No, we want the graph OF the node at path.
    // If path is [], graph is spec.
    // If path is [Root], implicitly spec?
    // User passes "Root" as first item. But viewPath starts empty.

    // The "path" prop passed here includes a fake "Root" item at index 0.
    // Spec viewPath starts from index 1.

    // If we want children of "Root" (index 0), we look at spec (top level).
    // If we want children of "Group A" (index 1), we find Group A in spec, look at its graph.

    // We iterate from 1 to level (inclusive).
    for (let i = 1; i < path.length; i++) {
        const p = path[i];
        if (!current || !current.nodes) return null;
        const node = current.nodes.find((n: any) => n.id === p.id);
        if (!node || !node.data.graph) return null;
        current = node.data.graph;
    }
    return current;
};

export const Breadcrumbs = ({ path, onNavigate, masterGraph }: BreadcrumbsProps) => {
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigate = (index: number) => {
        // Navigate to the item at index.
        // Slice logic:
        // Item 0 (Root). path.slice(0, 1) -> [Root].
        // UseSpecGraph expects path WITHOUT Root.
        // So we pass path.slice(1, index + 1).

        // Wait, onNavigate passed from Editor handles the conversion?
        // Let's assume onNavigate expects the VIEW PATH (without Root).
        // If we click Root (index 0), we want [] (Empty).
        // If we click G1 (index 1), we want [G1].

        // This is handled by slicing the CURRENT path prop (which has Root).
        // Then removing Root (slice(1)).
        const newViewPath = path.slice(1, index + 1);
        onNavigate(newViewPath);
        setOpenDropdown(null);
    };

    const handleDropdownClick = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setOpenDropdown(openDropdown === index ? null : index);
    };

    const handleChildClick = (index: number, child: any) => {
        // We are at 'index'. We clicked a child 'child'.
        // New path should be path until index + child using label.

        const basePath = path.slice(1, index + 1);
        const newPath = [...basePath, { id: child.id, label: child.data.label }];
        onNavigate(newPath);
        setOpenDropdown(null);
    };

    return (
        <div style={{
            padding: '0px 16px',
            background: 'var(--bg-secondary, #252526)',
            color: 'var(--text-secondary, #ccc)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--font-family, sans-serif)'
        }}>
            {path.map((item, index) => {
                const isLast = index === path.length - 1;
                // Get sibling groups for this level
                // We need the graph at (path up to this item)
                const graphAtLevel = getGraphAt(masterGraph, path.slice(0, index + 1));
                const children = graphAtLevel?.nodes?.filter((n: any) => n.type === 'Group') || [];

                return (
                    <React.Fragment key={item.id}>
                        {index > 0 && <MdChevronRight style={{ color: '#666' }} />}

                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span
                                onClick={() => handleNavigate(index)}
                                style={{
                                    cursor: 'pointer',
                                    color: isLast ? 'var(--text-primary, #fff)' : 'var(--text-secondary, #ccc)',
                                    fontWeight: isLast ? 'bold' : 'normal',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '0px 1rem',
                                    height: '2rem',
                                    borderRadius: '4px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {index === 0 && <MdHome size={14} />}
                                {item.label}
                            </span>

                            {/* Dropdown Trigger - Only if there are children groups */}
                            {children.length > 0 && (
                                <div
                                    onClick={(e) => handleDropdownClick(index, e)}
                                    style={{
                                        cursor: 'pointer',
                                        padding: '0px 2px',
                                        height: '2rem',
                                        marginLeft: '2px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: openDropdown === index ? '#007fd4' : 'inherit'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <MdExpandMore size={14} />
                                </div>
                            )}

                            {/* Dropdown Menu */}
                            {openDropdown === index && (
                                <div
                                    ref={dropdownRef}
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        marginTop: '4px',
                                        background: '#2d2d2d',
                                        border: '1px solid #454545',
                                        borderRadius: '4px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                        zIndex: 1000,
                                        minWidth: '150px',
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '4px 0'
                                    }}
                                >
                                    {children.map((child: any) => (
                                        <div
                                            key={child.id}
                                            onClick={() => handleChildClick(index, child)}
                                            style={{
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                color: '#eee',
                                                fontSize: '13px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#007fd4'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ width: 8, height: 8, background: child.data.categoryColor || '#888', borderRadius: '50%' }} />
                                            {child.data.label || 'Group'}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

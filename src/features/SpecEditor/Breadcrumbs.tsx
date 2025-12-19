import React, { useState, useEffect, useRef } from 'react';
import { MdHome, MdChevronRight, MdExpandMore } from 'react-icons/md';

interface BreadcrumbItem {
    id: string;
    label: string;
}

interface BreadcrumbsProps {
    path: BreadcrumbItem[];
    onNavigate: (newPath: BreadcrumbItem[]) => void;
    masterGraph: any;
}

// Helper to get graph at a specific path
const getGraphAt = (spec: any, path: { id: string }[]) => {
    let current = spec;
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
        const newViewPath = path.slice(1, index + 1);
        onNavigate(newViewPath);
        setOpenDropdown(null);
    };

    const handleDropdownClick = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setOpenDropdown(openDropdown === index ? null : index);
    };

    const handleChildClick = (index: number, child: any) => {
        const basePath = path.slice(1, index + 1);
        const newPath = [...basePath, { id: child.id, label: child.data.label }];
        onNavigate(newPath);
        setOpenDropdown(null);
    };

    return (
        <div className="breadcrumbs-container">
            {path.map((item, index) => {
                const isLast = index === path.length - 1;
                const graphAtLevel = getGraphAt(masterGraph, path.slice(0, index + 1));
                const children = graphAtLevel?.nodes?.filter((n: any) => n.type === 'Group') || [];

                return (
                    <React.Fragment key={item.id}>
                        {index > 0 && (
                            <div className="breadcrumb-separator">
                                <MdChevronRight size={16} />
                            </div>
                        )}

                        <div className="relative flex-row items-center">
                            <span
                                onClick={() => handleNavigate(index)}
                                className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                            >
                                {index === 0 && <MdHome size={16} />}
                                {item.label}
                            </span>

                            {/* Dropdown Trigger - Only if there are children groups */}
                            {children.length > 0 && (
                                <div
                                    onClick={(e) => handleDropdownClick(index, e)}
                                    className={`breadcrumb-dropdown-trigger ${openDropdown === index ? 'active' : ''}`}
                                >
                                    <MdExpandMore size={16} />
                                </div>
                            )}

                            {/* Dropdown Menu */}
                            {openDropdown === index && (
                                <div ref={dropdownRef} className="breadcrumb-dropdown-menu">
                                    {children.map((child: any) => (
                                        <div
                                            key={child.id}
                                            onClick={() => handleChildClick(index, child)}
                                            className="breadcrumb-dropdown-item"
                                        >
                                            <div
                                                className="breadcrumb-dot"
                                                style={{ background: child.data.categoryColor || 'var(--text-secondary)' }}
                                            />
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

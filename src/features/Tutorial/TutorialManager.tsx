import { useRef, useEffect } from 'react';
import { driver } from 'driver.js';
import type { Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useData } from '../../context/DataContext';

export const TutorialManager = () => {
    const {
        activeTutorial,
        setActiveTutorial,
        loadTutorialData,
        setActiveEngine,
        setActiveSpec,
        entries,
        setActiveTools,
        setActiveTab,
        setActivePane
    } = useData();

    const driverRef = useRef<Driver | null>(null);

    const resetPanels = () => {
        setActivePane(null);
        setActiveTools([]);
    };

    useEffect(() => {
        if (activeTutorial === 'onboarding') {
            const d = driver({
                showProgress: true,
                allowClose: false,
                allowKeyboardControl: false,
                overlayColor: 'rgba(0,0,0,0.85)',
                stageRadius: 10,
                showButtons: ['next', 'close'],
                popoverClass: 'driverjs-theme',
                steps: [
                    {
                        popover: {
                            title: 'Welcome to Armillaris!',
                            description: 'Armillaris is a lorebook creation toolchain for creators and developers.',
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#toolbar-engine',
                        popover: {
                            title: 'Engine Configuration',
                            description: 'Click this icon in the left toolbar to open the engine selection and settings.',
                            side: "right",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                // Pre-open the panel before moving to the next step
                                setActivePane('engine');
                                setActiveEngine('armilaris_engine');
                                setActiveSpec('spec_default.behavior');
                                // Giving React some time to mount the panel
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        },
                        onHighlightStarted: () => {
                            resetPanels();
                            setActiveTab('data');
                        }
                    },
                    {
                        element: '#panel-engine',
                        popover: {
                            title: 'Engine Settings',
                            description: 'We\'ve selected the default engine for you - you can change it anytime.',
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: '#tab-data',
                        popover: {
                            title: 'Data Entry',
                            description: 'The Data tab is where you write and edit your lorebook content.',
                            side: "bottom",
                            align: 'start'
                        },
                        onHighlightStarted: () => {
                            setActiveEngine('armilaris_engine');
                            setActiveSpec('spec_default.behavior');
                            resetPanels();
                            setActiveTab('data');
                        }
                    },
                    {
                        element: '#toolbar-import',
                        popover: {
                            title: 'Importing Lore',
                            description: 'Click here to import lore from external sources. We\'ll load some demo data for you now.',
                            side: "right",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActivePane('import');
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        },
                        onHighlightStarted: () => {
                            if (entries.length === 0) {
                                loadTutorialData();
                            }
                        }
                    },
                    {
                        element: '#panel-import',
                        popover: {
                            title: 'Import Settings',
                            description: 'You can import lore directly from your own live Notion databases.',
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: '#tab-graph',
                        popover: {
                            title: 'Simulation Graph',
                            description: 'This is where you can see how your lorebook reacts to user chats.',
                            side: "bottom",
                            align: 'start'
                        },
                        onHighlightStarted: () => {
                            resetPanels();
                            setActiveTab('graph');
                        }
                    },
                    {
                        element: '#right-activity-bar',
                        popover: {
                            title: 'Right Sidebar',
                            description: 'This sidebar toggles this view\'s tools.',
                            side: "left",
                            align: 'start'
                        }
                    },
                    {
                        element: '#right-bar-spec_editor',
                        popover: {
                            title: 'Behavior Editor',
                            description: 'Click this icon to open the Behavior Editor.',
                            side: "left",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTools(['spec_editor']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        },
                        onHighlightStarted: () => {
                            setActiveTools([]);
                        }
                    },
                    {
                        element: '#panel-spec-editor',
                        popover: {
                            title: 'Behavior Graph',
                            description: 'These nodes control which lore entries activate during a conversation. You can edit them yourself, or get a .behavior file from your favorite creators.',
                            side: "top",
                            align: 'start'
                        }
                    },
                    {
                        element: '#right-bar-output',
                        popover: {
                            title: 'Activation Output',
                            description: 'Click this icon to see what your lorebook is saying to the bot.',
                            side: "left",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTools(['output']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        },
                        onHighlightStarted: () => {
                            setActiveTools([]);
                        }
                    },
                    {
                        element: '#panel-activation-output',
                        popover: {
                            title: 'Live Outputs',
                            description: 'This panel displays the raw content of activated lore entries as you chat.',
                            side: "left",
                            align: 'start'
                        }
                    },
                    {
                        element: '#graph-chat-input',
                        popover: {
                            title: 'Chat Sandbox',
                            description: 'Try typing "Fria\'s location" to see activation in real time.',
                            side: "top",
                            align: 'start'
                        }
                    },
                    {
                        element: '#toolbar-export',
                        popover: {
                            title: 'Exporting',
                            description: 'That\'s all you need for a simple lorebook. Download it from this export panel.',
                            side: "right",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActivePane('export');
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#tab-modules',
                        popover: {
                            title: 'Module Management',
                            description: 'If you\'re looking for more simple features, you can install script modules made by the community.',
                            side: "bottom",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTab('modules');
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        },
                        onHighlightStarted: () => {
                            resetPanels();
                        }
                    },
                    {
                        element: '#module-list-available',
                        popover: {
                            title: 'Available Modules',
                            description: 'These are all the modules currently on your computer. Click one to view its details and installation instructions.',
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: '#module-list-installed',
                        popover: {
                            title: 'Installed Chain',
                            description: 'Drag modules from the available list to here to install them. The order of this list determines the order of execution in your final lorebook!',
                            side: "left",
                            align: 'start'
                        }
                    },
                    {
                        element: '#panel-export',
                        popover: {
                            title: 'Export Options',
                            description: 'You can see how the compression settings affect your lorebook script in Output View, but you can export from anywhere.',
                            side: "right",
                            align: 'start'
                        }
                    },
                    {
                        element: '#tab-develop',
                        popover: {
                            title: 'Develop View',
                            description: 'If you\'re building an engine, everything you need to support Armillaris is here.',
                            side: "bottom",
                            align: 'start'
                        },
                        onHighlightStarted: () => {
                            resetPanels();
                            setActiveTab('develop');
                        }
                    },
                    {
                        element: '#tab-output',
                        popover: {
                            title: 'Output View',
                            description: 'You can verify your script\'s filesize and final form here.',
                            side: "bottom",
                            align: 'start'
                        },
                        onHighlightStarted: () => {
                            resetPanels();
                            setActiveTab('output');
                        }
                    },
                    {
                        element: '#right-bar-info',
                        popover: {
                            title: 'Tutorials & Help',
                            description: 'Restart this tutorial or access more detailed help via the info icons at the bottom of the sidebars.',
                            side: "left",
                            align: 'start'
                        }
                    }
                ],
                onDestroyed: () => {
                    setActiveTutorial(null);
                }
            });

            driverRef.current = d;
            d.drive();
        }
    }, [activeTutorial]);

    return null;
};

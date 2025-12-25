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
        setActivePane,
        triggerFitView,
        setIsChatHistoryOpen,
        setIsChatCollapsed,
        addMessage,
        chatHistory,
        setIsGraphConfigOpen
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
                                setActiveEngine('armillaris_engine');
                                setActiveSpec('default.behavior');
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
                            setActiveEngine('armillaris_engine');
                            setActiveSpec('default.behavior');
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
                            description: 'You can import lore directly from popular lorebook formats, or your own live Notion databases.',
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
                            setActiveTools(['minimap']);
                            triggerFitView();
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
                                setActiveTools(['spec_editor', 'minimap']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        },
                        onHighlightStarted: () => {
                            setActiveTools(['minimap']);
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
                                setActiveTools(['output', 'minimap']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        },
                        onHighlightStarted: () => {
                            setActiveTools(['minimap']);
                        }
                    },
                    {
                        element: '#panel-activation-output',
                        popover: {
                            title: 'Live Outputs',
                            description: 'This panel displays the raw content of activated lore entries as you chat.',
                            side: "left",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                triggerFitView();
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#graph-chat-sandbox',
                        popover: {
                            title: 'Chat Sandbox',
                            description: 'Try typing "Fria\'s location" to see activation in real time.',
                            side: "top",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActivePane('export');
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#toolbar-export',
                        popover: {
                            title: 'Exporting',
                            description: 'That\'s all you need for a simple lorebook. Download it from this export panel.',
                            side: "right",
                            align: 'start',
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
                            setActiveTools(['size_visualization']);
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

        if (activeTutorial === 'data_tutorial') {
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
                        element: '#data-list-pane',
                        popover: {
                            title: 'Data List',
                            description: 'Every lore entry is listed here. You can search, filter, and sort your entries to find exactly what you need.',
                            side: "right",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTools(['schema']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#panel-schema',
                        popover: {
                            title: 'Meta Types',
                            description: 'Every entry has a Meta type which determines what attributes it has. You can define custom schemas here.',
                            side: "left",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTools([]);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#data-editor-pane',
                        popover: {
                            title: 'Main Editor',
                            description: 'This is where you can edit the attributes of the selected entry. You can use ALL CAPS for some extra highlighting.',
                            side: "left",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTools(['data_storage']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#panel-data_storage',
                        popover: {
                            title: 'Data Management',
                            description: 'Armillaris keeps version history backups of all your data. You can also switch between sets of data as "projects". Clean up is easy if it takes too much space!',
                            side: "left",
                            align: 'start'
                        }
                    }
                ],
                onDestroyed: () => {
                    setActiveTutorial(null);
                    resetPanels();
                }
            });

            driverRef.current = d;
            d.drive();
        }

        if (activeTutorial === 'graph_tutorial') {
            const d = driver({
                showProgress: true,
                allowClose: false,
                allowKeyboardControl: false,
                overlayColor: 'rgba(0,0,0,1.0)',
                stageRadius: 10,
                showButtons: ['next', 'close'],
                popoverClass: 'driverjs-theme',
                steps: [
                    {
                        popover: {
                            title: 'Graph View',
                            description: 'This is where all the data entries live as graph nodes. The connection lines represent Relations between the entries, described by the attached labels. Blue nodes represent entries \'activated\' by your lorebook engine.',
                            side: "bottom",
                            align: 'start'
                        },
                        onHighlightStarted: () => {
                            setActiveTab('graph');
                            resetPanels();
                            setIsChatCollapsed(true);
                            // Ensure graph config is closed initially
                            setIsGraphConfigOpen(false);
                        }
                    },
                    {
                        element: '#graph-config-panel',
                        popover: {
                            title: 'Graph Configuration',
                            description: 'You can hide connection labels here if it gets too complex. Press arrange graph, and Armillaris will try to space out and group highly related nodes.',
                            side: "right",
                            align: 'start'
                        },
                        onHighlightStarted: () => {
                            setIsGraphConfigOpen(true);
                        }
                    },
                    {
                        element: '#arrange-lock-toggle',
                        popover: {
                            title: 'Lock Toggle',
                            description: 'If you arrange your nodes yourself, Lock the arrange button so you don\'t accidentally undo all your hard work.',
                            side: "right",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setIsGraphConfigOpen(false);
                                driver.moveNext();
                            }
                        }
                    },
                    {
                        element: '#right-bar-minimap',
                        popover: {
                            title: 'Minimap Toggle',
                            description: 'This toggles the minimap.',
                            side: "left",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTools(['minimap']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '.react-flow__minimap',
                        popover: {
                            title: 'Minimap',
                            description: 'You can left click-drag on this minimap to pan around large graphs.',
                            side: "right",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setIsChatCollapsed(false);
                                // Pre-add message so history is ready
                                if (chatHistory.length === 0) {
                                    addMessage('user', 'Hello! Who are you?');
                                }
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#graph-chat-sandbox',
                        popover: {
                            title: 'Chat Sandbox',
                            description: 'This chat lets you easily see what text your engine is highlighting to point out to you. Usually this means it\'s a keyword or match from some search that affects the activation output. Press \'send\' to add a message to the history, untoggle Now to manually set the sending date.',
                            side: "top",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setIsChatHistoryOpen(true);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        },
                        onHighlightStarted: () => {
                            setIsChatCollapsed(false);
                        }
                    },
                    {
                        element: '#chat-history-status-dot',
                        popover: {
                            title: 'Chat History',
                            description: 'You can click the dates to edit them, or click between messages to add new bot messages.',
                            side: "top",
                            align: 'start'
                        }
                    },
                    {
                        element: '#chat-sandbox-header',
                        popover: {
                            title: 'Sandbox Title Bar',
                            description: 'You can collapse the history, move the chat out of the way, or collapse the chat altogether with the buttons here. The blue dot indicates if there are history messages, even if the history is collapsed.',
                            side: "bottom",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                driver.moveNext();
                            }
                        }
                    },
                    {
                        element: '#right-bar-engine_context',
                        popover: {
                            title: 'Engine Context Button',
                            description: 'The chat works together with the engine context to provide all the possible data a lorebook can read during a session.',
                            side: "left",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTools(['engine_context', 'minimap']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#panel-engine-context',
                        popover: {
                            title: 'Engine Context Panel',
                            description: 'These inputs simulate everything as it is before being sent to the lorebook.',
                            side: "right",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTools(['output', 'minimap']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#panel-activation-output',
                        popover: {
                            title: 'Activation Outputs',
                            description: 'And this Activation Output panel shows all the lorebook outputs, named so because typically outputs are heavily determined by activated entries.',
                            side: "left",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                driver.moveNext();
                            }
                        }
                    },
                    {
                        element: '#right-bar-spec_editor',
                        popover: {
                            title: 'Behavior Button',
                            description: 'This button opens the behavior editor.',
                            side: "left",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActiveTools(['spec_editor', 'minimap']);
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#panel-spec-editor',
                        popover: {
                            title: 'Behavior Editor',
                            description: 'Each behavior is a node graph showing how entries, chat, and other inputs are transformed by behavior nodes to activate entries or insert output text.',
                            side: "top",
                            align: 'start'
                        }
                    },
                    {
                        element: '#behavior-manager',
                        popover: {
                            title: 'Behavior Selection',
                            description: 'You can select an active behavior here. Each one can expect entries to have different Attributes, and causes your engine to activate entries in different ways. For amillaris_engine, I\'ve created behaviors which emulate how popular lorebook engines work, so you may already be familiar with their capabilities. It\'s easy to duplicate and start adjusting the behaviors to your liking.',
                            side: "left",
                            align: 'start'
                        }
                    },
                    {
                        element: '.spec-editor-canvas',
                        popover: {
                            title: 'Node Graph Area',
                            description: 'Each behavior node has ports of different types, which you can click+drag to another node\'s ports of a compatible type to connect. Double-click the connection line to remove it. Clicking the port label on a behavior node connected to an output will show the raw data being passed through the node. Right click on the node title for options.',
                            side: "top",
                            align: 'start'
                        }
                    },
                    {
                        element: '.spec-editor-canvas',
                        popover: {
                            title: 'Node Graph Area',
                            description: 'The glow on some behavior nodes represents that it\'s connected to an output node and at least one port\'s output is "truthy". For example, an Entry Filter will glow if its conditions allow at least one Entry to pass through it.',
                            side: "top",
                            align: 'start'
                        }
                    },
                    {
                        element: '#behavior-breadcrumbs',
                        popover: {
                            title: 'Breadcrumbs Bar',
                            description: 'You can create Group nodes and box-select-drag other nodes inside to help organize your more complex behaviors. This Breadcrumbs navigation bar will help you navigate your layers of nested groups.',
                            side: "bottom",
                            align: 'start'
                        }
                    },
                    {
                        element: '#node-palette',
                        popover: {
                            title: 'Node Palette',
                            description: 'Drag nodes from the node pallette to add new nodes to your behavior. You can save groups as Custom nodes for easy access in any behavior.',
                            side: "right",
                            align: 'start',
                            onNextClick: (_el: any, _step: any, { driver }: any) => {
                                setActivePane('import');
                                setTimeout(() => driver.moveNext(), 400);
                            }
                        }
                    },
                    {
                        element: '#panel-import',
                        popover: {
                            title: 'Import Panel',
                            description: 'You can import behaviors others have made. All your behaviors are stored at %appdata%\\armillaris\\Engines\\ in the related engine folder, inside a behavior folder.',
                            side: "right",
                            align: 'start'
                        }
                    }
                ],
                onDestroyed: () => {
                    setActiveTutorial(null);
                    // Reopen minimap and activation outputs
                    setActiveTools(['minimap', 'output']);
                    setIsChatCollapsed(false);
                    setIsChatHistoryOpen(false);
                    setIsGraphConfigOpen(false);
                }
            });

            driverRef.current = d;
            d.drive();
        }
    }, [activeTutorial]);

    return null;
};

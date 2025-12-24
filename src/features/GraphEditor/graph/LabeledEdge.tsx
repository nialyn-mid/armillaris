import {
    BaseEdge,
    getBezierPath,
    EdgeLabelRenderer,
    type EdgeProps
} from 'reactflow';

// Custom Edge for End Labels
export const LabeledEdge = ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data
}: EdgeProps) => {
    // We only need the path, ignore label positions
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Active State Styling
    const isActive = data?.isActive;
    const labelColor = isActive ? '#58a6ff' : '#8b949e';
    const borderColor = isActive ? '#58a6ff' : '#30363d';
    const zIndex = isActive ? 20 : 5;

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                {data?.targetLabel && (
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${sourceX + (targetX - sourceX) * 0.15}px, ${sourceY + (targetY - sourceY) * 0.15}px)`,
                            fontSize: 10,
                            pointerEvents: 'none',
                            background: '#161b22',
                            padding: '2px 4px',
                            borderRadius: 4,
                            color: labelColor,
                            border: `1px solid ${borderColor}`,
                            zIndex: zIndex
                        }}
                        className="nodrag nopan"
                    >
                        {data.targetLabel}
                    </div>
                )}
                {/* Source Label (near end) */}
                {data?.sourceLabel && (
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${targetX - (targetX - sourceX) * 0.15}px, ${targetY - (targetY - sourceY) * 0.15}px)`,
                            fontSize: 10,
                            pointerEvents: 'none',
                            background: '#161b22',
                            padding: '2px 4px',
                            borderRadius: 4,
                            color: labelColor,
                            border: `1px solid ${borderColor}`,
                            zIndex: zIndex
                        }}
                        className="nodrag nopan"
                    >
                        {data.sourceLabel}
                    </div>
                )}
            </EdgeLabelRenderer>
        </>
    );
};

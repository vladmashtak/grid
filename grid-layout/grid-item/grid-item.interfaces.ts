export interface IDragState {
    // Start top/left
    startX:number; startY:number;
    // Offset between start top/left and mouse top/left
    offsetX:number; offsetY:number,
    // Current top/left
    clientX:number; clientY:number;
}

export interface IResizeState {
    lastX: number; lastY: number;
    width: number; height: number;
    offsetW: number; offsetH: number;
}

export interface IFrameSizeItem {
    minConstraints: Array<any>;
    maxConstraints: Array<any>;
}

export interface IGridItemState {
    resize?: IResizeState;
    drag?: IDragState;
    frame?: IFrameSizeItem;
    isExpanded?: boolean;
}

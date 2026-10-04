// Invalidates private responses after logout or a change of authenticated context.
let epoch = 0;
export const sessionEpoch = () => epoch;
export const advanceSessionEpoch = () => ++epoch;

/** Tiny shared flag so sidebar links can warn about unsaved editor changes. */
let dirty = false;
export const setDirtyFlag = (value: boolean) => { dirty = value; };
export const isDirty = () => dirty;
export const UNSAVED_MESSAGE = "You have unsaved changes. Leave without saving?";

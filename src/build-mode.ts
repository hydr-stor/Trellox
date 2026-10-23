/** GitHub Pages serves only the public design preview; the Worker build keeps full functionality. */
export const isStaticPreview = import.meta.env.MODE === "pages";

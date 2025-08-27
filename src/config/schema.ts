export interface Config {
  // Root of the workspace; paths must reside under this directory when set
  workspaceRoot?: string;
  // Allow shell escape (default false unless enabled)
  allowShellEscape?: boolean;
  // Default TeX engine for compilation
  defaultEngine?: "pdflatex" | "xelatex" | "lualatex";
  // Default Docker image for container compilation
  dockerImage?: string;
  // TeXstudio executable override path
  texstudioExe?: string;
}

export const defaultConfig: Config = {
  allowShellEscape: false,
  defaultEngine: "pdflatex",
  dockerImage: "texlive/texlive",
};

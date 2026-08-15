export const importErrors = {
  invalid_url: "Enter a public GitHub repository URL in the form https://github.com/owner/repository.",
  access: "That selected repository is no longer available to this GitHub installation. Update access and try again.",
  public_only: "Manual URL import is limited to public GitHub repositories. Use selected GitHub access for a private codebase.",
  unavailable: "The pinned revision could not be inspected. Check the repository and full commit, then try again.",
} as const;

export type ImportErrorCode = keyof typeof importErrors;

export function importErrorMessage(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value in importErrors ? importErrors[value as ImportErrorCode] : null;
}

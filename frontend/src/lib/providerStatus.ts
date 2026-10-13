export function providerConfigurationLabel(configured: boolean | undefined): string {
  if (configured === true) return 'Configured';
  if (configured === false) return 'Not configured';
  return 'Unknown';
}

// Photo-rights consent gate. A photo of a real person may only enter the
// ritual after the player affirms they have the right to use it — see
// docs/superpowers/specs/2026-07-27-da-siu-yan-image-consent-design.md.
//
// Swapping the image ALWAYS clears the confirmation: the undertaking is about
// one specific photo and must never be inherited by the next one. A failed
// decode arrives here as photoChanged(false) and is simply "no photo".
export function createConsent() {
  let hasPhoto = false, confirmed = false;
  return {
    photoChanged(accepted) { hasPhoto = accepted; confirmed = false; },
    setConfirmed(v) { confirmed = v; },
    canStart: () => !hasPhoto || confirmed,
    state: () => ({ hasPhoto, confirmed })
  };
}

// reception-model.js — pure state machine for the vestibule ID check.
// platform.js dispatches events from onAuth / DOM clicks / animation
// completions, and renders phases into the turnstile, camera moves and the
// check-in card. Phases:
//   boot        first paint, auth state unknown yet
//   out         signed out, wandering the vestibule (turnstile red)
//   checkin     the check-in card is open at the desk
//   authing     Google popup in flight
//   welcome     stamp + welcome moment, turnstile opening
//   wave        already signed in on load — receptionist waves you through
//   floor       on the main floor
//   unavailable Firebase modules unreachable (Practice + 2D exit only)
export const initialReception = { phase: 'boot', error: null };

export function receptionReduce(state, ev) {
  switch (ev.type) {
    case 'AUTH_READY':
      return state.phase === 'boot'
        ? { phase: ev.signedIn ? 'wave' : 'out', error: null } : state;
    case 'AUTH_UNAVAILABLE': return { phase: 'unavailable', error: 'auth-unavailable' };
    case 'OPEN_CHECKIN':  return state.phase === 'out' ? { phase: 'checkin', error: state.error } : state;
    case 'CLOSE_CHECKIN': return state.phase === 'checkin' ? { phase: 'out', error: null } : state;
    case 'SIGNIN_START':  return state.phase === 'checkin' ? { phase: 'authing', error: null } : state;
    case 'SIGNIN_ERROR':  return state.phase === 'authing' ? { phase: 'checkin', error: ev.code || 'signin-failed' } : state;
    case 'SIGNED_IN':
      // Auth can also complete from another tab / a still-open popup while
      // the card is closed — welcome from any signed-out phase.
      return ['authing', 'checkin', 'out'].includes(state.phase) ? { phase: 'welcome', error: null } : state;
    case 'WELCOME_DONE': return state.phase === 'welcome' ? { phase: 'floor', error: null } : state;
    case 'WAVE_DONE':    return state.phase === 'wave' ? { phase: 'floor', error: null } : state;
    case 'SIGNED_OUT':   return state.phase === 'boot' ? state : { phase: 'out', error: null };
    default: return state;
  }
}

export const canPassTurnstile = (s) => ['welcome', 'wave', 'floor'].includes(s.phase);

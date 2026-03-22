import { ChefHat, X, Check } from 'lucide-react';
import type { ChefPendingMessage } from '../../lib/chef-types';

interface ChefMessageProps {
  pending: ChefPendingMessage;
  onAccept?: () => void;    // called when user clicks "Elfogadom"
  onReject?: () => void;    // called when user clicks "Nem most"
  onDismiss: () => void;    // always available — closes card
}

export function ChefMessage({ pending, onAccept, onReject, onDismiss }: ChefMessageProps) {
  return (
    <div
      role="region"
      aria-label="Chef üzenet"
      style={{
        background: 'linear-gradient(135deg, rgba(15,118,110,0.08) 0%, rgba(20,184,166,0.04) 100%)',
        border: '1px solid rgba(15,118,110,0.18)',
        borderRadius: '1rem',
        padding: '0.875rem 1rem',
        margin: '0.75rem 0.75rem 0',
        position: 'relative',
      }}
    >
      {/* Dismiss (×) — always visible */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Bezár"
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9ca3af', padding: 4, lineHeight: 1,
        }}
      >
        <X size={14} />
      </button>

      {/* Header: avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div
          aria-hidden
          style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChefHat size={14} color="white" />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0f766e', letterSpacing: '0.01em' }}>
          A Séf
        </span>
      </div>

      {/* Chef's message text */}
      <p style={{
        margin: 0,
        fontSize: '0.875rem',
        lineHeight: 1.55,
        color: '#1f2937',
        paddingRight: '1.25rem', // don't overlap with dismiss button
      }}>
        {pending.message}
      </p>

      {/* Accept / Reject — only when proposal requires approval */}
      {pending.requiresApproval && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={onAccept}
            style={{
              flex: 1, padding: '0.45rem 0', borderRadius: '0.5rem',
              background: '#0f766e', color: 'white', border: 'none',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <Check size={12} /> Elfogadom
          </button>
          <button
            type="button"
            onClick={onReject}
            style={{
              flex: 1, padding: '0.45rem 0', borderRadius: '0.5rem',
              background: 'rgba(15,118,110,0.08)', color: '#0f766e',
              border: '1px solid rgba(15,118,110,0.2)',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Nem most
          </button>
        </div>
      )}
    </div>
  );
}

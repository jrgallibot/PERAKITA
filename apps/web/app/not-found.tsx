/**
 * Must stay free of client hooks / SPA imports.
 * Static export prerenders /_not-found and crashes if React context is used here.
 */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6 }}>
        PeraKita
      </p>
      <h1 style={{ margin: 0, fontSize: 32 }}>Page not found</h1>
      <p style={{ margin: 0, opacity: 0.7 }}>This link is missing or moved.</p>
      <a
        href="/login"
        style={{
          marginTop: 8,
          padding: '10px 20px',
          borderRadius: 12,
          background: '#0D9488',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Back to login
      </a>
    </main>
  );
}

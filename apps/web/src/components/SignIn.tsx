// React hooks for future auth implementation

export default function SignIn() {
  // Email state will be used when custom auth forms are implemented

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{ 
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ 
          textAlign: 'center',
          color: '#333',
          marginBottom: '30px',
          fontSize: '24px'
        }}>
          Sign in to FeedbackHub
        </h1>
        
        <div style={{
          padding: '20px',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffeaa7',
          textAlign: 'center'
        }}>
          <p style={{ 
            color: '#856404',
            margin: 0,
            fontSize: '14px'
          }}>
            🚧 Authentication system is being upgraded to SuperTokens
          </p>
        </div>
      </div>
    </div>
  );
}
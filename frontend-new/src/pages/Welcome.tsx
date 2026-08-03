import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #7c2d12 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative dots pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '200px',
        height: '100%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        opacity: 0.5
      }}></div>

      {/* Logo */}
      <div style={{
        marginBottom: '40px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '40px'
          }}>🛡️</div>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            fontSize: '24px'
          }}>📡</div>
        </div>
        <div style={{
          color: 'white',
          fontSize: '32px',
          fontWeight: 'bold',
          textShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }}>
          Poshan AI
        </div>
      </div>

      {/* Welcome Text */}
      <h1 style={{
        color: 'rgba(255,255,255,0.9)',
        fontSize: '32px',
        fontWeight: '300',
        marginBottom: '15px',
        textAlign: 'center',
        textShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        Welcome to
      </h1>

      {/* Main Title */}
      <h2 style={{
        color: 'white',
        fontSize: '64px',
        fontWeight: 'bold',
        marginBottom: '25px',
        textAlign: 'center',
        textShadow: '0 4px 15px rgba(0,0,0,0.4)',
        letterSpacing: '2px'
      }}>
        POSHAN AI
      </h2>

      {/* Subtitle */}
      <p style={{
        color: 'rgba(255,255,255,0.85)',
        fontSize: '20px',
        marginBottom: '60px',
        textAlign: 'center',
        maxWidth: '600px',
        lineHeight: '1.6',
        textShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        Smart Nutrition Monitoring & Meal Management System
      </p>

      {/* Get Started Button */}
      <button
        onClick={() => navigate('/portal-selection')}
        style={{
          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
          color: 'white',
          padding: '18px 60px',
          fontSize: '20px',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          transition: 'all 0.3s',
          boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
          textTransform: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.5)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.4)';
        }}
      >
        Get Started →
      </button>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        Powered by AI
      </div>
    </div>
  );
};

export default Welcome;

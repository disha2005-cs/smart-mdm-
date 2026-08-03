import { useNavigate } from 'react-router-dom';

const PortalSelection = () => {
  const navigate = useNavigate();

  const handleContinue = (portal: 'government' | 'school') => {
    navigate('/login', { state: { portal } });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Title */}
      <h1 style={{
        color: 'white',
        fontSize: '48px',
        fontWeight: 'bold',
        marginBottom: '60px',
        textAlign: 'center',
        textShadow: '0 4px 10px rgba(0,0,0,0.3)'
      }}>
        Choose Your Portal
      </h1>

      {/* Portal Cards */}
      <div style={{
        display: 'flex',
        gap: '40px',
        maxWidth: '900px',
        width: '100%',
        justifyContent: 'center'
      }}>
        {/* Government Portal */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '50px 40px',
          width: '350px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          transition: 'transform 0.3s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {/* Icon */}
          <div style={{
            fontSize: '80px',
            marginBottom: '30px'
          }}>
            🏛️
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1e40af',
            marginBottom: '15px'
          }}>
            Government
          </h2>

          {/* Description */}
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '35px',
            lineHeight: '1.5'
          }}>
            Manage Schools, Reports and Inventory
          </p>

          {/* Button */}
          <button
            onClick={() => handleContinue('government')}
            style={{
              background: '#1e40af',
              color: 'white',
              padding: '15px 50px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 5px 20px rgba(30, 64, 175, 0.4)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#1e3a8a'}
            onMouseOut={(e) => e.currentTarget.style.background = '#1e40af'}
          >
            Continue
          </button>
        </div>

        {/* School Portal */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '50px 40px',
          width: '350px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          transition: 'transform 0.3s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {/* Icon */}
          <div style={{
            fontSize: '80px',
            marginBottom: '30px'
          }}>
            🏫
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1e40af',
            marginBottom: '15px'
          }}>
            School
          </h2>

          {/* Description */}
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '35px',
            lineHeight: '1.5'
          }}>
            Manage Students, Meals and Attendance
          </p>

          {/* Button */}
          <button
            onClick={() => handleContinue('school')}
            style={{
              background: '#1e40af',
              color: 'white',
              padding: '15px 50px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 5px 20px rgba(30, 64, 175, 0.4)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#1e3a8a'}
            onMouseOut={(e) => e.currentTarget.style.background = '#1e40af'}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortalSelection;

import Layout from '../components/Layout';

const Dashboard = () => {
  return (
    <Layout>
      {/* Top Header */}
      <div style={{
        background: 'white',
        padding: '20px 30px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Greenwood High School • 14:35:02 • 26-Oct-2023
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ fontSize: '20px' }}>🔔</span>
          <span style={{ fontSize: '20px' }}>⚙️</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '30px' }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Students Card */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: '#dbeafe',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                👥
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>342</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Total Students in School</div>
              </div>
            </div>
          </div>

          {/* Rice Stock Card */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: '#fef3c7',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                🌾
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>115 kg / 45 kg</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Rice Remaining Today</div>
              </div>
            </div>
          </div>

          {/* Alerts Card */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: '#fee2e2',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                🔔
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>3</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>New Alerts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          {/* Students Present Today */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '20px'
            }}>
              Total Students Present Today: 287
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#4b5563',
                marginBottom: '8px'
              }}>
                <span>Class</span>
                <span>Name</span>
                <span>Time</span>
              </div>
            </div>

            {[
              { name: 'Ranjit Sharma', class: '5A', time: '14:30:00' },
              { name: 'Priya Kapoor', class: '6B', time: '14:30:15' },
              { name: 'Aarav Mehta', class: '4B', time: '14:34:55' },
              { name: 'Om Patel', class: '7C', time: '14:34:55' },
              { name: 'Kavita Singh', class: '3A', time: '14:34:55' },
              { name: 'Rohit Kumar', class: '5C', time: '14:34:55' }
            ].map((student, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: idx % 2 === 0 ? '#f9fafb' : 'white',
                borderRadius: '6px',
                marginBottom: '6px'
              }}>
                <div style={{
                  width: '35px',
                  height: '35px',
                  background: '#dbeafe',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  👤
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                    {student.name}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', minWidth: '40px' }}>
                  {student.class}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', minWidth: '80px' }}>
                  {student.time}
                </div>
              </div>
            ))}

            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '20px'
            }}>
              <button style={{
                flex: 1,
                padding: '10px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                📹 Camera
              </button>
              <button style={{
                flex: 1,
                padding: '10px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                ✅ Attendance
              </button>
            </div>
          </div>

          {/* Alerts Section */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '20px'
            }}>
              ⚠️ Alerts
            </h3>

            {[
              {
                title: 'Item: Rice Department',
                desc: 'Real-Day Meal Stock Verification needed for 26-Oct-2023',
                time: '00:00:00',
                type: 'warning'
              },
              {
                title: 'Absent Today',
                desc: 'Class',
                class: '5A',
                time: '00:00:00',
                type: 'info'
              },
              {
                title: 'Rohan Verma',
                desc: 'Class',
                class: '8C',
                time: '00:00:00',
                type: 'info'
              },
              {
                title: 'Neha Singh',
                desc: 'Class',
                class: '2C',
                time: '00:00:00',
                type: 'info'
              },
              {
                title: 'Satya Motan',
                desc: 'Class',
                class: '9A',
                time: '00:00:00',
                type: 'info'
              }
            ].map((alert, idx) => (
              <div key={idx} style={{
                padding: '15px',
                background: alert.type === 'warning' ? '#fef3c7' : '#dbeafe',
                borderRadius: '8px',
                marginBottom: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '4px'
                    }}>
                      {alert.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {alert.desc} {alert.class && <strong>{alert.class}</strong>}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {alert.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

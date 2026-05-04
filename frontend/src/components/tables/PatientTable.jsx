const PatientTable = ({ patients, onSelect }) => {
  if (!patients?.length) {
    return <p className="text-[var(--text-muted)] text-center py-8">No patients found.</p>;
  }

  return (
    <div className="telemetry-table">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Room</th>
            <th>Doctor</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td className="font-medium text-[var(--text-primary)]">{patient.name}</td>
              <td className="text-[var(--text-secondary)]">{patient.room || 'N/A'}</td>
              <td className="text-[var(--text-secondary)]">{patient.doctor || 'Unassigned'}</td>
              <td>
                <span className={`status-pill ${patient.active ? 'status-ok' : 'status-muted'}`}>
                  {patient.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <button
                  onClick={() => onSelect?.(patient.id)}
                  className="secondary-button text-sm py-1 px-3"
                >
                  Monitor
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PatientTable;

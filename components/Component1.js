const { useState, useEffect } = React;

function Component1() {
  const [key, setKey] = useState('');
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load existing credentials
    if (window.electronAPI) {
      window.electronAPI.getCredentials().then(creds => {
        setKey(creds.key);
        setSecret(creds.secret);
      });
    }
  }, []);

  const handleSave = async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.saveCredentials(key, secret);
        setMessage('Credentials saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage('Error saving credentials.');
      }
    }
  };

  return (
    <div>
      <h2>Alpaca API Credentials</h2>
      <div>
        <input 
          type="text" 
          placeholder="Alpaca API Key" 
          value={key} 
          onChange={(e) => setKey(e.target.value)} 
        />
      </div>
      <div>
        <input 
          type="password" 
          placeholder="Alpaca API Secret" 
          value={secret} 
          onChange={(e) => setSecret(e.target.value)} 
        />
      </div>
      <button onClick={handleSave}>Save Credentials</button>
      {message && <p>{message}</p>}
    </div>
  );
}
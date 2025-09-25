const AddDevice = () => {
  return (
    <div>
      <h2>Add Device</h2>
      <form>
        <label>
          Device Name:
          <input type="text" name="deviceName" />
        </label>
        <label>
          Device Type:
          <select name="deviceType">
            <option value="sensor">Sensor</option>
            <option value="camera">Camera</option>
            <option value="light">Light</option>
          </select>
        </label>
        <button type="submit">Add Device</button>
      </form>
    </div>
  );
};
export default AddDevice;
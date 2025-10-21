// Loads the selected device's data into the edit modal form.
export const handleEdit = (device, setEditingDevice, setEditData) => {
  setEditingDevice(device.id);
  setEditData({
    sensorName: device.sensorName,
    location: device.location,
    description: device.description || "",
  });
};

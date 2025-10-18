// Loads the selected device's data into the edit modal form.
export const handleEdit = (device, setEditingDevice, setEditData) => {
  setEditingDevice(device.id);
  setEditData({
    name: device.name,
    location: device.location,
    description: device.description || "",
  });
};
// Sets up edit modal fields when editing a device
export const handleEdit = (device, setEditingDevice, setEditData) => {
  setEditingDevice(device.id);
  setEditData({
    sensorName: device.sensorName || "",
    location: device.location || "",
    description: device.description || "",
    maxHeight: device.maxHeight || 0,
    normalLevel: device.normalLevel || 0,
    alertLevel: device.alertLevel || 0,
  });
};

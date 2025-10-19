// src/components/ContactSettings_contents/ContactSettings_contents_functions/handleOpenEditModal.js

/**
 * Open edit modal and populate fields
 */
export const handleOpenEditModal = (contact, setEditingContact, setEditData) => {
  setEditingContact(contact);
  setEditData({
    Contact_name: contact.Contact_name,
    Home_address: contact.Home_address,
    Position: contact.Position,
    Phone_number: contact.Phone_number,
  });
};

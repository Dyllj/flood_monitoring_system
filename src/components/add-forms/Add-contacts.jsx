const AddContacts = () => {
  return (
    <div>
      <h2>Add Contacts</h2>
      <form>
        <label>
          Contact Name:
          <input type="text" name="contactName" />
        </label>
        <label>
          Contact Email:
          <input type="email" name="contactEmail" />
        </label>
        <button type="submit">Add Contact</button>
      </form>
    </div>
  );
};
export default AddContacts;
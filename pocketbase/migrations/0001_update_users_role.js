migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['cliente', 'profissional'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('phone')) {
      users.fields.add(
        new TextField({
          name: 'phone',
          required: false,
        }),
      )
    }

    // Allow professionals to list/view client profiles, and users to view themselves
    users.listRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.role = 'profissional')"
    users.viewRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.role = 'profissional')"
    users.createRule = ''
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const roleField = users.fields.getByName('role')
    if (roleField) users.fields.removeByName('role')
    const phoneField = users.fields.getByName('phone')
    if (phoneField) users.fields.removeByName('phone')
    app.save(users)
  },
)

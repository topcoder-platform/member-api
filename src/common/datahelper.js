const helper = require('./helper')
const eshelper = require('./eshelper')

/**
 * Get mocked transaction for es and db
 * @returns
 */
const getTransaction = () => {
  return {
    create: { db: [], es: [] },
    update: { db: [], es: [] },
    delete: { db: [], es: [] },
    rollback: async function () {
      for (const data of this.create.db) {
        await helper.remove(data, null)
      }
      for (const data of this.create.es) {
        await eshelper.remove(data.id, data.typeName, null)
      }
      for (const data of this.update.db) {
        await helper.itemSave(null, data, 'update', null)
      }
      for (const data of this.update.es) {
        await eshelper.update(data.id, data.typeName, data.payload, null)
      }
      for (const data of this.delete.db) {
        await helper.itemSave(null, data, 'create', null)
      }
      for (const data of this.delete.es) {
        await eshelper.create(data.id, data.typeName, data.payload, null)
      }
    }
  }
}

module.exports = {
  getTransaction
}

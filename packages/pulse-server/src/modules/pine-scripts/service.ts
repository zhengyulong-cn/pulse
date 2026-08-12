import type { db } from '../../prisma/db.js'
import type { FieldInputTypes, FieldOutputTypes } from '../../prisma/contract.js'

type Database = typeof db

export type PineScriptType = FieldInputTypes['public']['PineScript']['type']
type PineScript = FieldOutputTypes['public']['PineScript']

export type CreatePineScriptBody = {
  content: string
  description: string
  type: PineScriptType
}

export type UpdatePineScriptBody = Partial<CreatePineScriptBody>

export const pineScriptService = {
  async list(database: Database, type?: PineScriptType): Promise<PineScript[]> {
    const scripts = type === undefined
      ? database.orm.public.PineScript
      : database.orm.public.PineScript.where({ type })

    return scripts.orderBy((script) => script.updatedAt.desc())
      .orderBy((script) => script.id.desc())
      .all()
  },

  get(database: Database, scriptId: number) {
    return database.orm.public.PineScript.where({ id: scriptId }).first()
  },

  create(database: Database, input: CreatePineScriptBody) {
    return database.orm.public.PineScript.create({
      content: input.content,
      description: input.description.trim(),
      type: input.type,
    })
  },

  update(database: Database, scriptId: number, input: UpdatePineScriptBody) {
    return database.orm.public.PineScript.where({ id: scriptId }).update({
      ...(input.content === undefined ? {} : { content: input.content }),
      ...(input.description === undefined ? {} : { description: input.description.trim() }),
      ...(input.type === undefined ? {} : { type: input.type }),
      updatedAt: new Date(),
    })
  },

  delete(database: Database, scriptId: number) {
    return database.orm.public.PineScript.where({ id: scriptId }).delete()
  },
}

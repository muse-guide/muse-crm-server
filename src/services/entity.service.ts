import {InternalServerErrorException, NotFoundException} from "../common/exceptions";
import {DynamoClient, exhibitionSnapshotTable, exhibitionTable} from "../clients/dynamo.client";
import {Exhibition} from "../model/exhibition.model";
import {ExhibitionSnapshot} from "../model/exhibition-snapshot.model";

class EntityService<ENTITY extends Record<string, any>> {

    private entityDbClient: DynamoClient<ENTITY>

    constructor(entityDbClient: DynamoClient<ENTITY>) {
        this.entityDbClient = entityDbClient;
    }

    async getEntity(partitionKeyValue: string, sortKeyValue?: string): Promise<ENTITY> {
        try {
            return await this.entityDbClient.getItem(partitionKeyValue, sortKeyValue)
        } catch (err: unknown) {
            if (err instanceof NotFoundException) {
                throw new NotFoundException(`Entity id: ${partitionKeyValue} not found.`)
            }
            throw err
        }
    }

    async createEntity(entity: ENTITY): Promise<ENTITY> {
        try {
            await this.entityDbClient.createItem(entity)
            return entity
        } catch (err: unknown) {
            if (err instanceof InternalServerErrorException) {
                throw new InternalServerErrorException(`Entity creation failed.`)
            }
            throw err
        }
    }

    async deleteEntity(partitionKeyValue: string, sortKeyValue?: string) {
        try {
            await this.entityDbClient.deleteItem(partitionKeyValue, sortKeyValue)
        } catch (err: unknown) {
            if (err instanceof NotFoundException) {
                throw new NotFoundException(`Entity id: ${partitionKeyValue} not found.`)
            }
            throw err
        }
    }
}

export const exhibitionService = new EntityService<Exhibition>(exhibitionTable)
export const exhibitionSnapshotService = new EntityService<ExhibitionSnapshot>(exhibitionSnapshotTable)
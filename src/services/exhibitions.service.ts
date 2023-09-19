import {Exhibition} from "../model/exhibition.model";
import {InternalServerErrorException, NotFoundException} from "../common/exceptions";
import {DynamoClient, exhibitionTable} from "../clients/dynamo.client";

class ExhibitionsService {

    private exhibitionClient: DynamoClient<Exhibition>

    constructor(exhibitionClient: DynamoClient<Exhibition>) {
        this.exhibitionClient = exhibitionClient;
    }

    async getExhibition(id: string, customerId: string): Promise<Exhibition> {
        try {
            return await this.exhibitionClient.getItem(id, customerId)
        } catch (err: unknown) {
            if (err instanceof NotFoundException) {
                throw new NotFoundException(`Exhibition id: ${id} not found.`)
            }
            throw err
        }
    }

    async createExhibition(exhibition: Exhibition): Promise<Exhibition> {
        try {
            return await this.exhibitionClient.createItem(exhibition)
        } catch (err: unknown) {
            if (err instanceof InternalServerErrorException) {
                throw new InternalServerErrorException(`Exhibition creation failed.`)
            }
            throw err
        }
    }

    async deleteExhibition(id: string, customerId: string): Promise<Exhibition> {
        try {
            return await this.exhibitionClient.deleteItem(id, customerId)
        } catch (err: unknown) {
            if (err instanceof NotFoundException) {
                throw new NotFoundException(`Exhibition id: ${id} not found.`)
            }
            throw err
        }
    }
}

export const exhibitionService = new ExhibitionsService(exhibitionTable)
import {updateExhibitionTxHandler} from "../src/exhibition-update.handler";
import {EXHIBITION_TABLE, TxInput} from "../src/model/table.model";

describe("updateExhibitionTxHandler", () => {

    it("should update exhibition", async () => {

        const input = {
            body: {
                referenceName: "New Name",
                langOptions: [
                    {
                        lang: "en",
                        title: "New Title",
                        subtitle: "New subtitle"
                    }
                ]
            },
            path: {
                id: "exhibition123"
            },
            sub: "customer456"
        };

        const output = await updateExhibitionTxHandler(input);

        expect(output.mutation.referenceName).toEqual("New Name");
        expect(output.mutation.langOptions[0].title).toEqual("New Title");

        expect(output.exhibitionSnapshotsToAdd.length).toEqual(0);
        expect(output.exhibitionSnapshotsToDelete.length).toEqual(0);
        expect(output.exhibitionSnapshotsToUpdate.length).toEqual(1);

        expect(output.imagesToAdd.length).toEqual(0);
        expect(output.imagesToDelete.length).toEqual(0);
        expect(output.imagesToUpdate.length).toEqual(0);
    });

    it('should generate update inputs for Exhibition table', () => {

        const items = [
            {
                id: 'exh1',
                customerId: 'cust1',
                name: 'Exhibition 1'
            },
            {
                id: 'exh2',
                customerId: 'cust2',
                name: 'Exhibition 2'
            }
        ];

        const expected = [
            {
                Update: {
                    TableName: EXHIBITION_TABLE.name,
                    Key: {
                        [EXHIBITION_TABLE.partitionKey]: 'exh1',
                        [EXHIBITION_TABLE.sortKey!!]: 'cust1'
                    },
                    UpdateExpression: 'SET #name = :name',
                    ExpressionAttributeNames: {
                        '#name': 'name'
                    },
                    ExpressionAttributeValues: {
                        ':name': 'Exhibition 1'
                    }
                }
            },
            {
                Update: {
                    TableName: EXHIBITION_TABLE.name,
                    Key: {
                        [EXHIBITION_TABLE.partitionKey]: 'exh2',
                        [EXHIBITION_TABLE.sortKey!!]: 'cust2'
                    },
                    UpdateExpression: 'SET #name = :name',
                    ExpressionAttributeNames: {
                        '#name': 'name'
                    },
                    ExpressionAttributeValues: {
                        ':name': 'Exhibition 2'
                    }
                }
            }
        ];

        const result = TxInput.updateOf(EXHIBITION_TABLE, ...items);

        expect(result).toEqual(expected);
    });

});
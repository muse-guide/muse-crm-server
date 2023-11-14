import {Exhibition, ImageRef} from "./exhibition.model";
import {ExhibitionSnapshot} from "./exhibition-snapshot.model";

export interface StateMachineInput {
    sub: string;
    path?: { [name: string]: string | undefined };
    querystring?: { [name: string]: string | undefined };
    body?: any;
}

export const EMPTY_STRING = ""
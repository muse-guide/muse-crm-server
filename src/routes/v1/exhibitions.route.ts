import { Request, Response, Router } from 'express';
import {handleError, handleResponse} from "../../common/response.handler";
import {exhibitionService} from "../../services/exhibitions.service";

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        res.status(200).json([]);
    } catch (error) {
        handleError(error, res)
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const exhibition = exhibitionService.getExhibition(req.params["id"])
        handleResponse(exhibition, res)
    } catch (error) {
        handleError(error, res)
    }
});

export default router;
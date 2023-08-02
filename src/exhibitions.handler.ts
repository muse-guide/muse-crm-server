import express from 'express';
import serverless from 'serverless-http';

import routes from './routes/v1/exhibitions.route';

const app = express();

app.use(express.json());

app.use('/v1/exhibitions', routes);

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(404).send();
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(err.status || 500).send();
});

export const exhibitionsHandler = serverless(app);
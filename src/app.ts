    // IMPORT
    import express from 'express';
    import request from 'request';

    import config from 'config';
    const expressConfig: any = config.get('express');

    // DÉCLARATION
    const app = express();

    /**********************
     **CORS/CACHE PART*****
    **********************/
    app.use((req, res, next) => {
        // CORS
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

        // CACHE
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        next();
    });

    /**********************
     ******PROXY PART******
    **********************/
    app.use(expressConfig.proxyRoute + '*', (req: any, res: any) => {
        // Récupération de l'url Original qui contient tout
        const url = getParamsFromUrl(req.originalUrl);
        // On utilise la deuxième partis de l'url original comme url de calanedrier
        console.log(url);
        req.pipe(request(url)).pipe(res);

    });

    // ÉCOUTE DU PORT
    app.listen(expressConfig.port);
    console.log('Listening on port '+expressConfig.port);
    console.log('Listening on path '+expressConfig.proxyRoute);
    

    /**
     * Cette methode se charge de séparer l'id groupe du reste de l'url ics
     * @param oriUrl l'url complet de la requete initiale
     */
    function getParamsFromUrl(oriUrl: string): any {
        try {
            const url = oriUrl.split(expressConfig.proxyRoute, 2)[1];
            return url;
        } catch (error) {
            throw new Error('L\'url n\'est pas correct' + oriUrl);
        }
    }
                 
console.log(`
██████╗ ██╗███████╗██████╗  ██████╗ ███████╗████████╗
██╔══██╗██║██╔════╝██╔══██╗██╔═══██╗██╔════╝╚══██╔══╝
██████╔╝██║█████╗  ██████╔╝██║   ██║███████╗   ██║   
██╔══██╗██║██╔══╝  ██╔══██╗██║   ██║╚════██║   ██║   
██████╔╝██║██║     ██║  ██║╚██████╔╝███████║   ██║   
╚═════╝ ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   
                                                     
 █████╗ ██████╗ ██╗                                  
██╔══██╗██╔══██╗██║                                  
███████║██████╔╝██║                                  
██╔══██║██╔═══╝ ██║                                  
██║  ██║██║     ██║                                  
╚═╝  ╚═╝╚═╝     ╚═╝                                  
                                                     
`);
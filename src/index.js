const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const OpenApiValidator = require('express-openapi-validator');

const app = express();

const port = 3000;

const swaggerDocument = YAML.load('./openapi.yaml');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.json());

app.use(
    OpenApiValidator.middleware({
        apiSpec: './api-spec.yaml',
        ignorePaths: /docs/,
    }),
);

app.get('/hello', (req, res) => {
    res.json({ message: "hello world" });
});

app.post('/users', (req, res) => {
    // Desestructuramos los datos del cuerpo de la petición
    const { name, age, email } = req.body;

    // No necesitamos validar los datos, OpenAPI ya lo hizo por nosotros

    // Creamos el nuevo usuario
    const newUser = {
        id: Date.now().toString(),
        name,
        age,
        email
    };

    // Enviamos la respuesta
    res.status(201).json(newUser);
});


app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        message: err.message,
        error: err,
    });
});

app.listen(port, () => {
    console.log(`Servidor funcionando en puerto ${port}`);
});
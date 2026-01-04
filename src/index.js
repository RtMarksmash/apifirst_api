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
        coerceTypes: true
    }),
);

// simple in-memory store
let users = [];
let nextId = 1;

app.get('/hello', (req, res) => {
    res.json({ message: "hello world" });
});

app.post('/users', (req, res) => {
    // Desestructuramos los datos del cuerpo de la petición
    const { name, age, email } = req.body;

    // Creamos el nuevo usuario (id numérico en almacenamiento, pero respondemos id como string según openapi.yaml)
    const id = nextId++;
    const newUser = {
        id, // número para búsquedas por /users/{id}
        name,
        age,
        email
    };

    users.push(newUser);

    // Enviamos la respuesta (id como string para cumplir el schema del POST /users)
    res.status(201).json({
        id: String(id),
        name,
        age,
        email
    });
});



app.get('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    const user = users.find(u => u.id === id);

    if (!user) {
        return res.status(404).json({ message: 'usuario no encontrado' });
    }

    res.json({
        id: user.id,
        name: user.name
    });
});

app.post('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    const user = users.find(u => u.id === id);

    if (!user) {
        return res.status(404).json({ message: 'usuario no encontrado' });
    }

    const { name, age, email } = req.body;

    user.name = name;
    user.age = age;
    user.email = email;

    res.json({
        id: user.id,
        name: user.name,
        age: user.age,
        email: user.email
    });
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
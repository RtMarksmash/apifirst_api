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

const products = [{
        id: '1',
        name: 'Laptop',
        description: 'Portátil de ejemplo',
        price: 999.99,
        category: ['electronics'],
        tags: ['computers'],
        inStock: true,
        ratings: [{ score: 5, comment: 'Excelente' }]
    },
    {
        id: '2',
        name: 'Libro de Node.js',
        description: 'Aprende Node.js',
        price: 29.99,
        category: ['books'],
        tags: ['programacion'],
        inStock: true,
        ratings: [{ score: 4, comment: 'Muy útil' }]
    }
];

const ALLOWED_CATEGORIES = ['electronics', 'books', 'clothes', 'food'];

function validateProductCreate(body) {
    const errors = [];

    // required: name, price, category
    if (typeof body.name !== 'string') {
        errors.push('name is required and must be a string');
    } else if (body.name.length < 2 || body.name.length > 40) {
        errors.push('name length must be between 2 and 40');
    }

    if (typeof body.price !== 'number' || !isFinite(body.price)) {
        errors.push('price is required and must be a number');
    } else {
        if (body.price < 0) errors.push('price must be >= 0');
        // multipleOf 0.01 -> check two decimal places
        const cents = Math.round(body.price * 100);
        if (Math.abs(body.price * 100 - cents) > 1e-6) errors.push('price must be a multiple of 0.01');
    }

    // category: expect array of allowed categories
    if (!Array.isArray(body.category) || body.category.length === 0) {
        errors.push('category is required and must be a non-empty array');
    } else {
        const invalids = body.category.filter(c => typeof c !== 'string' || !ALLOWED_CATEGORIES.includes(c));
        if (invalids.length) errors.push(`category items must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
    }

    // tags: optional array of strings, minItems 1 if present
    if (body.tags !== undefined) {
        if (!Array.isArray(body.tags) || body.tags.length < 1) {
            errors.push('tags must be an array with at least 1 item if provided');
        } else {
            const bad = body.tags.filter(t => typeof t !== 'string');
            if (bad.length) errors.push('all tags must be strings');
        }
    }

    // inStock: optional boolean
    if (body.inStock !== undefined && typeof body.inStock !== 'boolean') {
        errors.push('inStock must be boolean if provided');
    }

    return { valid: errors.length === 0, errors };
}


// Versión 1
app.get('/v1', (req, res) => {
    res.send({ message: "Hello" });
});

// Versión 2 con timestamp
app.get('/v2', (req, res) => {
    res.send({ message: "Hello", timestamp: new Date().toISOString() });
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

// GET /productos/:id
app.get('/productos/:id', (req, res) => {
    const { id } = req.params;
    const product = products.find(p => p.id === id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(product);
});

// PUT /productos/:id
app.put('/productos/:id', (req, res) => {
    const { id } = req.params;
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ message: 'Producto no encontrado' });

    const { valid, errors } = validateProductCreate(req.body);
    if (!valid) return res.status(400).json({ message: 'Datos inválidos', errors });

    // Build updated product (keep existing ratings if any)
    const updated = {
        id,
        ...req.body,
        ratings: products[idx].ratings || []
    };

    products[idx] = updated;
    res.json(updated);
});

// DELETE /productos/:id
app.delete('/productos/:id', (req, res) => {
    const { id } = req.params;
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ message: 'Producto no encontrado' });

    products.splice(idx, 1);
    res.status(204).send();
});



app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        message: err.message,
        error: err,
    });
});

app.listen(port, () => {
    console.log(`Servidor funcionando en puerto ${port}`);
    console.log(`Servidor funcionando en puerto ${port}/v1`);
    console.log(`Servidor funcionando en puerto ${port}/v2`);
});
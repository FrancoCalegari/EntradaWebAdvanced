// scripts/seed-events.js
// Carga eventos iniciales y sus entradas en la base de datos si la tabla eventos está vacía.

require('dotenv').config();
const databaseService = require('../services/database');

async function seed() {
  try {
    console.log('Verificando eventos existentes en la base de datos...');
    const actuales = await databaseService.query('SELECT COUNT(*) AS total FROM eventos');
    const total = actuales.result && actuales.result[0] ? actuales.result[0].total : 0;

    if (total > 0) {
      console.log(`Ya existen ${total} eventos en la base de datos. No es necesario poblar.`);
      return;
    }

    console.log('Poblando eventos iniciales...');

    const eventosIniciales = [
      {
        titulo: 'Coldplay — Music of the Spheres World Tour',
        descripcion: 'La banda británica liderada por Chris Martin regresa a Buenos Aires para una serie de conciertos históricos en el Estadio River Plate con una puesta en escena inmersiva y sustentable.',
        lugar: 'Estadio River Plate, Buenos Aires',
        fecha: '2026-11-15 21:00:00',
        imagen: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80',
        categoria: 'musica',
        precio_min: 35000,
        estado: 'disponible',
        entradas: [
          { tipo: 'Campo General', precio: 35000, stock: 500 },
          { tipo: 'Platea Alta', precio: 48000, stock: 300 },
          { tipo: 'Campo Delantero VIP', precio: 75000, stock: 150 },
        ],
      },
      {
        titulo: 'Lollapalooza Argentina 2027 — Preventa Exclusiva',
        descripcion: 'El festival más importante del país vuelve al Hipódromo de San Isidro con más de 100 bandas internacionales y nacionales en 5 escenarios durante 3 días.',
        lugar: 'Hipódromo de San Isidro, Buenos Aires',
        fecha: '2027-03-20 15:00:00',
        imagen: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
        categoria: 'musica',
        precio_min: 65000,
        estado: 'disponible',
        entradas: [
          { tipo: 'Abono 3 Días General', precio: 65000, stock: 1000 },
          { tipo: 'Abono 3 Días VIP Lolla Lounge', precio: 150000, stock: 200 },
        ],
      },
      {
        titulo: 'Hernán Cattaneo — Sunsetstrip Sunset Session',
        descripcion: 'El maestro del progressive house presenta su aclamado concepto Sunsetstrip en Ciudad Universitaria, bailando desde el atardecer con sonido de alta fidelidad.',
        lugar: 'Ciudad Universitaria, CABA',
        fecha: '2026-12-05 17:00:00',
        imagen: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
        categoria: 'musica',
        precio_min: 28000,
        estado: 'disponible',
        entradas: [
          { tipo: 'Early Bird', precio: 28000, stock: 250 },
          { tipo: 'General Fase 1', precio: 38000, stock: 400 },
          { tipo: 'VIP Backstage Experience', precio: 80000, stock: 80 },
        ],
      },
      {
        titulo: 'Piazzolla Inmortal — Orquesta Estable del Teatro Colón',
        descripcion: 'Un homenaje sinfónico irrepetible a la obra cumbre de Astor Piazzolla con solistas de renombre internacional en la sala principal del Teatro Colón.',
        lugar: 'Teatro Colón, CABA',
        fecha: '2026-11-28 20:30:00',
        imagen: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
        categoria: 'teatro',
        precio_min: 15000,
        estado: 'disponible',
        entradas: [
          { tipo: 'Paraíso / Galería', precio: 15000, stock: 120 },
          { tipo: 'Tertulia', precio: 22000, stock: 90 },
          { tipo: 'Platea Central', precio: 45000, stock: 60 },
        ],
      },
    ];

    for (const ev of eventosIniciales) {
      const res = await databaseService.queryParams(
        'INSERT INTO eventos (titulo, descripcion, lugar, fecha, imagen, categoria, precio_min, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [ev.titulo, ev.descripcion, ev.lugar, ev.fecha, ev.imagen, ev.categoria, ev.precio_min, ev.estado]
      );
      const eventoId = res.result.insertId;
      console.log(`✅ Evento creado: "${ev.titulo}" (ID: ${eventoId})`);

      for (const ent of ev.entradas) {
        await databaseService.queryParams(
          'INSERT INTO entradas (evento_id, tipo, precio, stock) VALUES (?, ?, ?, ?)',
          [eventoId, ent.tipo, ent.precio, ent.stock]
        );
        console.log(`   🎟️ Entrada agregada: ${ent.tipo} ($${ent.precio}, stock ${ent.stock})`);
      }
    }

    console.log('\n🎉 Base de datos poblada exitosamente.');
  } catch (error) {
    console.error('Error al poblar datos:', error.message);
    process.exit(1);
  }
}

seed();

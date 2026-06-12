import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Venue from '../models/Venue.js';
import Event from '../models/Event.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not found in .env');
  
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // 1. Clear existing data (optional, but requested for sample data refresh)
  await Event.deleteMany({});
  await LostItem.deleteMany({});
  await FoundItem.deleteMany({});
  console.log('Cleared existing events and lost/found items');

  // 2. Ensure basic entities exist
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      email: 'admin@sliit.lk',
      password: 'Admin123!',
      name: 'SLIIT Admin',
      role: 'admin',
    });
  }

  const categories = [
    { name: 'Academic', description: 'Lectures and conferences' },
    { name: 'Social', description: 'Student gatherings' },
    { name: 'Sports', description: 'Athletic events' },
    { name: 'Cultural', description: 'Arts and music' },
  ];
  for (const c of categories) {
    await Category.updateOne({ name: c.name }, { $setOnInsert: c }, { upsert: true });
  }
  const catDocs = await Category.find({});

  const venues = [
    { name: 'Main Auditorium', location: 'Level 1, New Building', capacity: 500 },
    { name: 'Mini Auditorium', location: 'Level 2, Old Building', capacity: 150 },
    { name: 'Campus Grounds', location: 'Main Entrance Area', capacity: 1000 },
    { name: 'IT Lab 04', location: 'Level 4, IT Faculty', capacity: 50 },
  ];
  for (const v of venues) {
    await Venue.updateOne({ name: v.name }, { $setOnInsert: v }, { upsert: true });
  }
  const venueDocs = await Venue.find({});

  // 3. Add 5 Valid SLIIT Events
  const now = new Date();
  const sliitEvents = [
    {
      title: 'SLIIT Orientation 2024',
      description: 'Welcoming the new batch of students to SLIIT. Meet your faculty and peers.',
      category: catDocs.find(c => c.name === 'Academic')._id,
      venue: venueDocs.find(v => v.name === 'Main Auditorium')._id,
      startDateTime: new Date(now.getTime() + 86400000 * 2), // 2 days from now
      endDateTime: new Date(now.getTime() + 86400000 * 2 + 10800000),
      capacity: 400,
      ticketingType: 'Free',
      locationType: 'Indoor',
      image: 'https://images.unsplash.com/photo-1523050853064-59f6f3984043?q=80&w=1000&auto=format&fit=crop',
      createdBy: admin._id,
    },
    {
      title: 'SLIIT Walk & Carnival',
      description: 'The annual campus walk followed by a mega carnival with music and food stalls.',
      category: catDocs.find(c => c.name === 'Social')._id,
      venue: venueDocs.find(v => v.name === 'Campus Grounds')._id,
      startDateTime: new Date(now.getTime() + 86400000 * 10), // 10 days from now
      endDateTime: new Date(now.getTime() + 86400000 * 10 + 28800000),
      capacity: 1000,
      ticketingType: 'Ticket',
      ticketPrice: 1500,
      locationType: 'Outdoor',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop',
      createdBy: admin._id,
    },
    {
      title: 'Inter-Faculty Cricket Sevens',
      description: 'Battle of the faculties! Who will take home the championship this year?',
      category: catDocs.find(c => c.name === 'Sports')._id,
      venue: venueDocs.find(v => v.name === 'Campus Grounds')._id,
      startDateTime: new Date(now.getTime() + 86400000 * 5),
      endDateTime: new Date(now.getTime() + 86400000 * 5 + 21600000),
      capacity: 200,
      ticketingType: 'Free',
      locationType: 'Outdoor',
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=1000&auto=format&fit=crop',
      createdBy: admin._id,
    },
    {
      title: 'ICIT 2024 - Tech Conference',
      description: 'International Conference on Information Technology. Featuring guest speakers from Google and Microsoft.',
      category: catDocs.find(c => c.name === 'Academic')._id,
      venue: venueDocs.find(v => v.name === 'Mini Auditorium')._id,
      startDateTime: new Date(now.getTime() + 86400000 * 15),
      endDateTime: new Date(now.getTime() + 86400000 * 15 + 14400000),
      capacity: 150,
      ticketingType: 'Ticket',
      ticketPrice: 2500,
      locationType: 'Indoor',
      image: 'https://images.unsplash.com/photo-1540575861501-7ad0582371f3?q=80&w=1000&auto=format&fit=crop',
      createdBy: admin._id,
    },
    {
      title: 'SLIIT Talent Show',
      description: 'Showcasing the incredible talents of SLIIT students in music, dance, and drama.',
      category: catDocs.find(c => c.name === 'Cultural')._id,
      venue: venueDocs.find(v => v.name === 'Main Auditorium')._id,
      startDateTime: new Date(now.getTime() - 86400000 * 2), // 2 days ago
      endDateTime: new Date(now.getTime() - 86400000 * 2 + 10800000),
      capacity: 500,
      ticketingType: 'Ticket',
      ticketPrice: 1000,
      locationType: 'Indoor',
      image: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=1000&auto=format&fit=crop',
      createdBy: admin._id,
    }
  ];

  await Event.insertMany(sliitEvents);
  console.log('Inserted 5 SLIIT events');

  // 4. Add 5 Lost Items
  const lostItems = [
    {
      reporter: admin._id,
      itemName: 'SLIIT Student ID',
      description: 'Lost a student ID card with name "Nuwan Perera". Blue lanyard.',
      category: 'Cards',
      dateLost: new Date(now.getTime() - 86400000),
      location: 'Canteen Area',
      publicId: 'LOST-001',
      photo: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?q=80&w=1000&auto=format&fit=crop'
    },
    {
      reporter: admin._id,
      itemName: 'Black Umbrella',
      description: 'Large black umbrella left in the library yesterday evening.',
      category: 'Accessories',
      dateLost: new Date(now.getTime() - 86400000 * 1.5),
      location: 'Library, 3rd Floor',
      publicId: 'LOST-002',
      photo: 'https://images.unsplash.com/photo-1533035353720-f1c6a75cd8ab?q=80&w=1000&auto=format&fit=crop'
    },
    {
      reporter: admin._id,
      itemName: 'Scientific Calc',
      description: 'Casio fx-991EX scientific calculator. Had a small sticker on the back.',
      category: 'Electronics',
      dateLost: new Date(now.getTime() - 86400000 * 3),
      location: 'IT Lab 02',
      publicId: 'LOST-003',
      photo: 'https://images.unsplash.com/photo-1574607383476-f517f260d30b?q=80&w=1000&auto=format&fit=crop'
    },
    {
      reporter: admin._id,
      itemName: 'Blue Water Bottle',
      description: 'Stainless steel water bottle, blue color with SLIIT logo.',
      category: 'Personal Items',
      dateLost: new Date(now.getTime() - 86400000 * 0.5),
      location: 'Student Union Gym',
      publicId: 'LOST-004',
      photo: 'https://images.unsplash.com/photo-1602143399827-7dc5a687980c?q=80&w=1000&auto=format&fit=crop'
    },
    {
      reporter: admin._id,
      itemName: 'Grey Hoodie',
      description: 'Size Medium, grey color hoodie with a small coffee stain on the sleeve.',
      category: 'Clothing',
      dateLost: new Date(now.getTime() - 86400000 * 4),
      location: 'Main Auditorium',
      publicId: 'LOST-005',
      photo: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1000&auto=format&fit=crop'
    }
  ];
  await LostItem.insertMany(lostItems);
  console.log('Inserted 5 Lost items');

  // 5. Add 5 Found Items
  const foundItems = [
    {
      finder: admin._id,
      itemName: 'House Keys',
      description: 'A bunch of 3 keys with a wooden keychain.',
      category: 'Accessories',
      dateFound: new Date(now.getTime() - 3600000 * 2),
      location: 'Parking Lot A',
      publicId: 'FND-001',
      photo: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=1000&auto=format&fit=crop'
    },
    {
      finder: admin._id,
      itemName: 'Power Bank',
      description: 'White Xiaomi power bank, 10000mAh.',
      category: 'Electronics',
      dateFound: new Date(now.getTime() - 86400000),
      location: 'Canteen Tables',
      publicId: 'FND-002',
      photo: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=1000&auto=format&fit=crop'
    },
    {
      finder: admin._id,
      itemName: 'Lab Coat',
      description: 'White lab coat, size Small. Found in the chemistry lab.',
      category: 'Clothing',
      dateFound: new Date(now.getTime() - 86400000 * 2),
      location: 'Science Lab 01',
      publicId: 'FND-003',
      photo: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1000&auto=format&fit=crop'
    },
    {
      finder: admin._id,
      itemName: 'Flash Drive',
      description: 'Sandisk 64GB flash drive, black and red.',
      category: 'Electronics',
      dateFound: new Date(now.getTime() - 3600000 * 5),
      location: 'Library PC Area',
      publicId: 'FND-004',
      photo: 'https://images.unsplash.com/photo-1622533553325-a50ca2573210?q=80&w=1000&auto=format&fit=crop'
    },
    {
      finder: admin._id,
      itemName: 'Reading Glasses',
      description: 'Black frame reading glasses in a brown case.',
      category: 'Accessories',
      dateFound: new Date(now.getTime() - 86400000 * 0.5),
      location: 'Mini Auditorium',
      publicId: 'FND-005',
      photo: 'https://images.unsplash.com/photo-1511499767390-90342f5b89a8?q=80&w=1000&auto=format&fit=crop'
    }
  ];
  await FoundItem.insertMany(foundItems);
  console.log('Inserted 5 Found items');

  console.log('Data refresh complete.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

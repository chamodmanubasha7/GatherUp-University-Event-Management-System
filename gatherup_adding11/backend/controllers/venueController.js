import Venue from '../models/Venue.js';

export async function listVenues(_req, res) {
  const items = await Venue.find().sort({ name: 1 });
  res.json(items);
}

export async function createVenue(req, res) {
  try {
    const { name, location, capacity } = req.body;
    const v = await Venue.create({
      name: name?.trim(),
      location: location?.trim(),
      capacity: Number(capacity),
    });
    res.status(201).json(v);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function updateVenue(req, res) {
  try {
    const { name, location, capacity } = req.body;
    const v = await Venue.findByIdAndUpdate(
      req.params.id,
      {
        ...(name != null && { name: name.trim() }),
        ...(location != null && { location: location.trim() }),
        ...(capacity != null && { capacity: Number(capacity) }),
      },
      { new: true, runValidators: true }
    );
    if (!v) return res.status(404).json({ message: 'Venue not found' });
    res.json(v);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteVenue(req, res) {
  const v = await Venue.findByIdAndDelete(req.params.id);
  if (!v) return res.status(404).json({ message: 'Venue not found' });
  res.json({ message: 'Deleted' });
}

const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AdminEventsPage.jsx', 'utf8');

const submitOld = `        if (err.response?.status === 409 && err.response?.data?.code === 'EVENT_DUPLICATE_VENUE_DAY_CATEGORY') {
          setErrors((prev) => ({
            ...prev,
            category: prev.category || 'An event already exists for this venue, category, and day.',
            venue: prev.venue || 'An event already exists for this venue, category, and day.',
            startDateTime: prev.startDateTime || 'Pick a different day, venue, or category.',
          }));
        }`;

const submitNew = `        if (err.response?.status === 409 && err.response?.data?.code === 'EVENT_LIMIT_WARNING') {
          if (window.confirm(err.response.data.message)) {
            fd.append('forceLimit', 'true');
            try {
              if (editing) {
                await api.put(\`/events/\${editing}\`, fd, config);
                toast.success('Event updated');
              } else {
                await api.post('/events', fd, config);
                toast.success('Event created');
              }
              setForm({
                title: '', description: '', category: form.category, venue: form.venue,
                startDateTime: '', endDateTime: '', capacity: form.capacity, ticketPrice: form.ticketPrice,
                locationType: form.locationType, ticketingType: form.ticketingType, ticketTiers: form.ticketTiers, link: form.link,
              });
              setPhoto(null); setVideo(null); setPdf(null); setPhotoPreview('');
              setUploadProgress(0); setEditing(null); setNotifyStudents(true);
              await load();
              return;
            } catch (retryErr) {
              err = retryErr;
            }
          } else {
            return;
          }
        }
        if (err.response?.status === 409 && err.response?.data?.code === 'EVENT_DUPLICATE_VENUE_DAY_CATEGORY') {
          setErrors((prev) => ({
            ...prev,
            category: prev.category || 'An event already exists for this venue, category, and day.',
            venue: prev.venue || 'An event already exists for this venue, category, and day.',
            startDateTime: prev.startDateTime || 'Pick a different day, venue, or category.',
          }));
        }`;

code = code.replace(submitOld, submitNew);
code = code.replace(/<input\s+type="datetime-local"\s+className="input-field"\s+value=\{form.endDateTime\}\s+onChange=\{\(e\) => setForm\(\{ \.\.\.form, endDateTime: e.target.value \}\)\}\s+required\s*\/>/g, 
`<input type="datetime-local" className="input-field" value={form.endDateTime} onChange={(e) => setForm({ ...form, endDateTime: e.target.value })} />`);

fs.writeFileSync('frontend/src/pages/AdminEventsPage.jsx', code);

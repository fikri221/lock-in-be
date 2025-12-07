import axios from 'axios';

const test = async () => {
    try {
        console.log('Testing /api/auth/me without token...');
        const response = await axios.get('http://localhost:5000/api/auth/me');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

        if (response.status === 200 && response.data.data.user === null) {
            console.log('PASS: Returned 200 OK and user is null as expected.');
        } else {
            console.log('FAIL: Unexpected response.');
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.status : error.message);
        if (error.response) {
            console.error('Error Data:', error.response.data);
        }
    }
};

test();

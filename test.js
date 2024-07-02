import fetch from 'node-fetch';
import { promises } from 'fs';
const { readFile } = promises;




async function runTestCases() {
    const testCases = JSON.parse(await readFile('test_data.json', 'utf-8'));

    for (const testCase of testCases) {
        const response = await fetch('http://localhost:3000/identify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCase)
        });

        const result = await response.json();
        console.log(`Request: ${JSON.stringify(testCase)}`);
        console.log(`Response: ${JSON.stringify(result)}`);
        console.log('-------------------------------------------------');
    }
}

runTestCases().catch(error => console.error('Error in running test cases:', error));

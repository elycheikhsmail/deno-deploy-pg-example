const myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json"); 

const requestOptions = {
  method: 'GET',
  headers: myHeaders, 
};

fetch("http://localhost:3002/todos", requestOptions)
  .then(response => {
    console.log(response.status)
    return response.text()})
  .then(result => console.log(result))
  .catch(error => console.log('error', error));
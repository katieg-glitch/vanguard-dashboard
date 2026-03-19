useEffect(() => {
  fetch('/api/airtable')
    .then(res => res.json())
    .then(data => {
      console.log(data)
      setData(data.records)
    })
}, [])

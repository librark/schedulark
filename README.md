<p align="center">
  <a href="https://codecov.io/gh/librark/schedulark">
    <img src="https://codecov.io/gh/librark/schedulark/graph/badge.svg?token=blaFaVDFrl"/>
  </a>
</p>
<p align="center">
  <a href="https://codecov.io/gh/librark/schedulark">
    <img src="https://codecov.io/gh/librark/schedulark/graphs/sunburst.svg?token=blaFaVDFrl"/>
  </a>
</p>

# Schedulark

Job Scheduling Library

## Usage

First, you should define your **jobs** so that they can be registered,
referenced and dispatched by your application. A **Job** is an object with
an **execute(context)** method which holds the information required by the
scheduler to enqueue and process it.

```javascript
import { Job } from '@knowark/schedulark/lib/index.js'

class MaintenanceJob extends Job {
  async execute(self, context) {
    const number = context.number || 1000
    let [first, second] = [0, 1]
    while (first < number) {
      first = second
      second = first + second
    }

    return { data: first }
  }
}
```

Then you can create an **Scheduler** instance to control the arrangement and
processing of its registered jobs.

```javascript
import { Scheduler } from '@knowark/schedulark/lib/index.js'

const scheduler = new Scheduler()
scheduler.register(MaintenanceJob)
```

Finally, you might schedule (using cron expressions) one of the jobs you have
previously registered so that it can be enqueued for execution.

```javascript
scheduler.schedule('MaintenanceJob', {n: 777}, '0 0 * * *')
```

Summing up, the complete program using Schedulark would look like:

```javascript
import { Job, Scheduler } from '@knowark/schedulark/lib/index.js'

class MaintenanceJob extends Job {
  async execute(context) {
    const number = context.number || 1000
    let [first, second] = 0, 1
    while (first < number) {
      first = second
      second = first + second
    }

    return { data: first }
  }
}

function main () {
  const scheduler = new Scheduler()
  scheduler.register(MaintenanceJob)

  scheduler.schedule('MaintenanceJob', {number: 765}, '0 0 * * *')
  scheduler.start()
}

main()

```

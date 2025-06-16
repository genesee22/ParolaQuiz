export const multipleChoiceSchema = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        questions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question: { type: 'string' },
                    options: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 4,
                        maxItems: 4
                    },
                    correctAnswer: { type: 'string' },
                    explanation: { type: 'string' }
                },
                required: ['question', 'options', 'correctAnswer', 'explanation']
            }
        }
    },
    required: ['title', 'questions']
};

export const fillInTheBlankSchema = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        questions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question: { type: 'string' },
                    options: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 4,
                        maxItems: 4
                    },
                    correctAnswer: { type: 'string' },
                    explanation: { type: 'string' }
                },
                required: ['question', 'options', 'correctAnswer', 'explanation']
            }
        }
    },
    required: ['title', 'questions']
};

export const matchingSchema = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        matchings: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    a: { type: 'string' },
                    b: { type: 'string' }
                },
                required: ['a', 'b'],
            },
        },
    },
    required: ['title', 'matchings']
};

export const trueFalseSchema = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        questions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question: { type: 'string' },
                    options: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 2,
                        maxItems: 2
                    },
                    correctAnswer: { type: 'string' },
                    explanation: { type: 'string' }
                },
                required: ['question', 'options', 'correctAnswer', 'explanation']
            }
        }
    },
    required: ['title', 'questions']
};

export const wordProcessSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            word: { type: 'string' },
            language: { type: 'string' },
            languageLevel: { type: 'string' },
            category: { type: 'string' },
            definition: { type: 'string' },
            exampleSentence: { type: 'string' }
        },
        required: ['word', 'language', 'languageLevel', 'category', 'definition']
    }
};

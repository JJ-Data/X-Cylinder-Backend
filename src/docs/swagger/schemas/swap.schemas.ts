import { OpenAPIV3_1 } from 'openapi-types';

export const swapSchemas: Record<string, OpenAPIV3_1.SchemaObject> = {
  SwapRecord: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Unique identifier for the swap record',
        example: 1
      },
      leaseId: {
        type: 'number',
        description: 'ID of the lease record',
        example: 1
      },
      oldCylinderId: {
        type: 'number',
        description: 'ID of the cylinder being swapped out',
        example: 1
      },
      newCylinderId: {
        type: 'number',
        description: 'ID of the new cylinder',
        example: 2
      },
      staffId: {
        type: 'number',
        description: 'ID of the staff member who performed the swap',
        example: 1
      },
      swapDate: {
        type: 'string',
        format: 'date-time',
        description: 'Date and time when the swap was performed'
      },
      condition: {
        type: 'string',
        enum: ['good', 'poor', 'damaged'],
        description: 'Condition of the old cylinder',
        example: 'good'
      },
      weightRecorded: {
        anyOf: [{ type: 'number' }, { type: 'null' }],
        description: 'Weight of the old cylinder in kg'
      },
      damageNotes: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Notes about any damage to the old cylinder'
      },
      swapFee: {
        type: 'number',
        description: 'Fee charged for the swap',
        example: 0
      },
      reasonForFee: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Reason for charging the swap fee'
      },
      receiptPrinted: {
        type: 'boolean',
        description: 'Whether the receipt has been printed',
        example: false
      },
      notes: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Additional notes about the swap'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp when the record was created'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp when the record was last updated'
      }
    },
    required: ['id', 'leaseId', 'oldCylinderId', 'newCylinderId', 'staffId', 'swapDate', 'condition', 'swapFee', 'receiptPrinted']
  },

  CreateSwapDto: {
    type: 'object',
    properties: {
      leaseId: {
        anyOf: [{ type: 'number' }, { type: 'null' }],
        description: 'ID of the lease record (if identifying by lease)'
      },
      cylinderCode: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Code of the cylinder being swapped (if identifying by code)'
      },
      qrCode: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'QR code of the cylinder being swapped (if identifying by QR)'
      },
      newCylinderId: {
        type: 'number',
        description: 'ID of the new cylinder to swap in',
        example: 2
      },
      condition: {
        type: 'string',
        enum: ['good', 'poor', 'damaged'],
        description: 'Condition assessment of the old cylinder',
        example: 'good'
      },
      weightRecorded: {
        anyOf: [{ type: 'number' }, { type: 'null' }],
        description: 'Weight of the old cylinder in kg'
      },
      damageNotes: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Notes about any damage to the old cylinder'
      },
      swapFee: {
        anyOf: [{ type: 'number' }, { type: 'null' }],
        description: 'Fee to charge for the swap (optional, auto-calculated based on condition)'
      },
      reasonForFee: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Reason for charging the swap fee'
      },
      notes: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Additional notes about the swap'
      }
    },
    required: ['newCylinderId', 'condition']
  },

  SwapsResponse: {
    type: 'object',
    properties: {
      swaps: {
        type: 'array',
        items: { $ref: '#/components/schemas/SwapRecord' },
        description: 'List of swap records'
      },
      total: {
        type: 'number',
        description: 'Total number of swap records',
        example: 150
      },
      page: {
        type: 'number',
        description: 'Current page number',
        example: 1
      },
      limit: {
        type: 'number',
        description: 'Number of records per page',
        example: 20
      },
      totalPages: {
        type: 'number',
        description: 'Total number of pages',
        example: 8
      }
    },
    required: ['swaps', 'total', 'page', 'limit', 'totalPages']
  },

  SwapStatistics: {
    type: 'object',
    properties: {
      totalSwaps: {
        type: 'number',
        description: 'Total number of swaps performed',
        example: 150
      },
      swapsByCondition: {
        type: 'object',
        properties: {
          good: {
            type: 'number',
            description: 'Number of swaps with good condition',
            example: 120
          },
          poor: {
            type: 'number',
            description: 'Number of swaps with poor condition',
            example: 20
          },
          damaged: {
            type: 'number',
            description: 'Number of swaps with damaged condition',
            example: 10
          }
        },
        required: ['good', 'poor', 'damaged']
      },
      totalFees: {
        type: 'number',
        description: 'Total fees collected from swaps',
        example: 15000
      },
      averageSwapFee: {
        type: 'number',
        description: 'Average fee per swap',
        example: 100
      },
      averageWeight: {
        type: 'number',
        description: 'Average weight of swapped cylinders',
        example: 12.5
      },
      mostActiveStaff: {
        type: 'object',
        properties: {
          staffId: {
            type: 'number',
            description: 'ID of the most active staff member',
            example: 1
          },
          staffName: {
            type: 'string',
            description: 'Name of the most active staff member',
            example: 'John Doe'
          },
          swapCount: {
            type: 'number',
            description: 'Number of swaps performed by this staff member',
            example: 45
          }
        },
        required: ['staffId', 'staffName', 'swapCount']
      },
      recentSwaps: {
        type: 'array',
        items: { $ref: '#/components/schemas/SwapRecord' },
        description: 'Recent swap records'
      }
    },
    required: ['totalSwaps', 'swapsByCondition', 'totalFees', 'averageSwapFee', 'averageWeight', 'mostActiveStaff', 'recentSwaps']
  },

  SwapReceiptData: {
    type: 'object',
    properties: {
      swap: { $ref: '#/components/schemas/SwapRecord' },
      customer: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          email: { type: 'string', example: 'customer@example.com' },
          firstName: { type: 'string', example: 'Jane' },
          lastName: { type: 'string', example: 'Smith' },
          phone: { anyOf: [{ type: 'string' }, { type: 'null' }] }
        },
        required: ['id', 'email', 'firstName', 'lastName']
      },
      outlet: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'Main Branch' },
          location: { type: 'string', example: '123 Main St, City' },
          phone: { anyOf: [{ type: 'string' }, { type: 'null' }] }
        },
        required: ['id', 'name', 'location']
      },
      oldCylinder: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          cylinderCode: { type: 'string', example: 'CYL001' },
          type: { type: 'string', example: '12.5kg' },
          currentGasVolume: { type: 'number', example: 5.2 }
        },
        required: ['id', 'cylinderCode', 'type', 'currentGasVolume']
      },
      newCylinder: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 2 },
          cylinderCode: { type: 'string', example: 'CYL002' },
          type: { type: 'string', example: '12.5kg' },
          currentGasVolume: { type: 'number', example: 12.5 },
          maxGasVolume: { type: 'number', example: 12.5 }
        },
        required: ['id', 'cylinderCode', 'type', 'currentGasVolume', 'maxGasVolume']
      }
    },
    required: ['swap', 'customer', 'outlet', 'oldCylinder', 'newCylinder']
  },

  CylinderLookupResponse: {
    type: 'object',
    properties: {
      lease: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          leaseStatus: { type: 'string', example: 'active' },
          customer: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              email: { type: 'string', example: 'customer@example.com' },
              firstName: { type: 'string', example: 'Jane' },
              lastName: { type: 'string', example: 'Smith' }
            }
          },
          outlet: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Main Branch' },
              location: { type: 'string', example: '123 Main St, City' }
            }
          }
        }
      },
      cylinder: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          cylinderCode: { type: 'string', example: 'CYL001' },
          type: { type: 'string', example: '12.5kg' },
          status: { type: 'string', example: 'leased' },
          currentGasVolume: { type: 'number', example: 5.2 }
        }
      }
    },
    required: ['lease', 'cylinder']
  },

  AvailableCylindersResponse: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 2 },
        cylinderCode: { type: 'string', example: 'CYL002' },
        type: { type: 'string', example: '12.5kg' },
        status: { type: 'string', example: 'available' },
        currentGasVolume: { type: 'number', example: 12.5 },
        maxGasVolume: { type: 'number', example: 12.5 }
      },
      required: ['id', 'cylinderCode', 'type', 'status', 'currentGasVolume', 'maxGasVolume']
    }
  },

  SuccessResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        description: 'Operation success status',
        example: true
      },
      message: {
        type: 'string',
        description: 'Success message',
        example: 'Operation completed successfully'
      }
    },
    required: ['success', 'message']
  }
};

export default swapSchemas;
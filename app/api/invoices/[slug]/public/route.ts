import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    )

    // Get invoice with client data
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (*)
      `)
      .eq('id', slug)
      .single()

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Generate or get share token
    let shareToken = invoice.share_token

    if (!shareToken) {
      // Generate unique share token
      shareToken = crypto.randomBytes(32).toString('hex')

      // Update invoice with share token
      await supabase
        .from('invoices')
        .update({ share_token: shareToken })
        .eq('id', slug)
    }

    // Return invoice data with share token
    return NextResponse.json({
      invoice: {
        ...invoice,
        share_token: shareToken
      }
    })

  } catch (error) {
    console.error('Error fetching public invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
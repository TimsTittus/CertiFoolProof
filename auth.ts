import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/lib/enums"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            email: string
            name: string
            role: UserRole
            department?: string | null
        }
    }

    interface User {
        id: string
        email: string
        name: string
        role: UserRole
        department?: string | null
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required")
                }

                const email = credentials.email as string
                const password = credentials.password as string

                const user = await prisma.user.findUnique({
                    where: { email },
                })

                if (!user) {
                    console.log(`[AUTH] User not found: ${email}`)
                    throw new Error("Invalid credentials - user not found")
                }

                console.log(`[AUTH] User found: ${user.email}, validating password...`)
                const isValidPassword = await bcrypt.compare(password, user.password)
                console.log(`[AUTH] Password valid: ${isValidPassword}`)

                if (!isValidPassword) {
                    throw new Error("Invalid credentials - password mismatch")
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role as UserRole,
                    department: user.department,
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.department = user.department
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string
                session.user.role = token.role as UserRole
                session.user.department = token.department as string | null | undefined
            }
            return session
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
})
